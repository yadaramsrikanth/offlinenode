const express=require("express")
const app=express()
const {open}=require("sqlite")
const path=require("path")
const sqlite3 = require("sqlite3")

const dbPath=path.join(__dirname,"info.db")
const bcrypt=require("bcrypt")
let db=null
const jwt=require("jsonwebtoken")

app.use(express.json())
const cors=require("cors")
console.log(123)

const initializeDBAndServer=async()=>{
    try{
        db=await open({
            filename:dbPath,
            driver:sqlite3.Database
    
        })
        app.listen(500,()=>{
            console.log("server running successfully")
        })
        
    }catch(e){
        console.log(`DB Error: ${e.message}`)
        process.exit(1)
    }
   
}

initializeDBAndServer()

//REGISTER
app.post("/register",async(request,response)=>{
    const {username,password,email}=request.body
    const hashedPassword=await bcrypt.hash(password,10)
    const selectUserQuery=`select * from user where username='${username}';`
    const dbUser=await db.get(selectUserQuery)
    if (dbUser===undefined){
        const createUserQuery=`INSERT INTO user (username,password,email)
        VALUES
        ('${username}','${hashedPassword}','${email}')
        ;`
        await db.run(createUserQuery)
        response.send("User registered successfully")
    }else{
        response.status(400)
        response.send("User Already Exists")
    }
})

//LOGIN
app.post("/login",async(request,response)=>{
    const {username,password}=request.body
    const selectuserQuery=`select * from user where username='${username}';`;
    const dbUser=await db.get(selectuserQuery)
    if (dbUser===undefined){
        response.status(400)
        response.send("User Needs to be register")
    }else{
        const isPasswordMatched=await bcrypt.compare(password,dbUser.password)
        if (isPasswordMatched){
            const payload={username:username}
            const jwtToken=jwt.sign(payload,"secret_token")
            response.send({jwtToken})
        }else{
            response.send("Invalid Password")
        }
        
        
    }
})

//MIDDLEWARE FUNCTION

const authentication=(request,response,next)=>{
    const authHeader=request.headers["authorization"]
    let jwtToken;
    if(authHeader!==undefined){
        jwtToken=authHeader.split(" ")[1]
    }
    if (jwtToken===undefined){
        response.status(400)
        response.send("Invalid jwt token")
    }else{
        jwt.verify(jwtToken,"secret_token",async(error,payload)=>{
            if(error){
                response.send("Invalid Jwt Token")
            }else{
                    next()
                    
            }
        })
    }
}


// GET REQUEST

app.get("/todos",authentication,async(request,response)=>{
    
    const gettodos=`select * from todo_items;`;
    const todosarray=await db.all(gettodos)
    response.send(todosarray)
           
    
})

//POST REQUEST

app.post("/todos",authentication,async(request,response)=>{
    const {todoId,description,status}=request.body
    const addTodo=`INSERT INTO todo_items(todo_id,description,status) VALUES
    (${todoId},'${description}','${status}')
    `
    await db.run(addTodo)
    response.send("Todo Added successfully")
})

//PUT REQUEST
app.put("/todos/:todoId",authentication,async(request,response)=>{
    const {todoId}=request.params
    const {description,status}=request.body
    const updateTodo=`UPDATE todo_items
        SET
        description='${description}',
        status='${status}'
        where 
        todo_id=${todoId};  
    `;
    await db.run(updateTodo)
    response.send("Updated")

})

//DELETE REQUEST
app.delete("/todos/:todoId",authentication,async(request,response)=>{
    const {todoId}=request.params
    const deleteTodo=`DELETE FROM todo_items where todo_id=${todoId};`;
    await db.run(deleteTodo)
    response.send("Deleted Todo successfully")
})