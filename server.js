const express=require("express");
const helmet=require("helmet");
const compression=require("compression");
const rateLimit=require("express-rate-limit");
const cookieSession=require("cookie-session");
const bcrypt=require("bcryptjs");
const app=express(),PORT=process.env.PORT||10000,AI_NAME="阮阮";
const GEMINI_MODEL=process.env.GEMINI_MODEL||"gemini-3.5-flash-lite";
const {GoogleGenAI}=require("@google/genai");
const gemini=process.env.GEMINI_API_KEY?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null;
const users=new Map(),conversations=new Map(),memories=new Map();
app.set("trust proxy",1);app.use(helmet({contentSecurityPolicy:false}));app.use(compression());app.use(express.json({limit:"15mb"}));
app.use(cookieSession({name:"ynai_session",keys:[process.env.SESSION_SECRET||"change-this"],httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",maxAge:1000*60*60*24*30}));
app.use("/api/",rateLimit({windowMs:60000,limit:60,standardHeaders:true,legacyHeaders:false}));
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function currentUser(req){return req.session?.userId?users.get(req.session.userId):null}
function auth(req,res,next){const u=currentUser(req);if(!u)return res.status(401).json({error:"Bạn chưa đăng nhập."});req.user=u;next()}
function pub(u){return{id:u.id,username:u.username,email:u.email,createdAt:u.createdAt}}
app.get("/api/health",(req,res)=>res.json({ok:true,app:"YamadaNihon AI",assistant:AI_NAME,model:GEMINI_MODEL,configured:!!gemini}));
app.post("/api/auth/register",async(req,res)=>{const{username,email,password}=req.body||{};if(!username||!email||!password||String(password).length<8)return res.status(400).json({error:"Vui lòng nhập đủ thông tin; mật khẩu tối thiểu 8 ký tự."});const e=String(email).trim().toLowerCase();if([...users.values()].some(u=>u.email===e))return res.status(409).json({error:"Email đã được sử dụng."});const u={id:uid(),username:String(username).trim().slice(0,40),email:e,passwordHash:await bcrypt.hash(String(password),12),createdAt:Date.now()};users.set(u.id,u);conversations.set(u.id,[]);memories.set(u.id,[]);req.session.userId=u.id;res.json({user:pub(u)})});
app.post("/api/auth/login",async(req,res)=>{const u=[...users.values()].find(x=>x.email===String(req.body?.email||"").trim().toLowerCase());if(!u||!(await bcrypt.compare(String(req.body?.password||""),u.passwordHash)))return res.status(401).json({error:"Email hoặc mật khẩu không đúng."});req.session.userId=u.id;res.json({user:pub(u)})});
app.post("/api/auth/logout",(req,res)=>{req.session=null;res.json({ok:true})});app.get("/api/auth/me",auth,(req,res)=>res.json({user:pub(req.user)}));
app.get("/api/conversations",auth,(req,res)=>res.json({conversations:(conversations.get(req.user.id)||[]).map(c=>({id:c.id,title:c.title,updatedAt:c.updatedAt}))}));
app.post("/api/conversations",auth,(req,res)=>{const c={id:uid(),title:"Cuộc trò chuyện mới",updatedAt:Date.now(),messages:[]};conversations.get(req.user.id).unshift(c);res.json({conversation:c})});
app.get("/api/conversations/:id",auth,(req,res)=>{const c=(conversations.get(req.user.id)||[]).find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:"Không tìm thấy cuộc trò chuyện."});res.json({conversation:c})});
app.patch("/api/conversations/:id",auth,(req,res)=>{const c=(conversations.get(req.user.id)||[]).find(x=>x.id===req.params.id);if(!c)return res.status(404).json({error:"Không tìm thấy cuộc trò chuyện."});c.title=String(req.body?.title||c.title).trim().slice(0,100);c.updatedAt=Date.now();res.json({conversation:c})});
app.delete("/api/conversations/:id",auth,(req,res)=>{const a=conversations.get(req.user.id)||[],i=a.findIndex(x=>x.id===req.params.id);if(i<0)return res.status(404).json({error:"Không tìm thấy cuộc trò chuyện."});a.splice(i,1);res.json({ok:true})});
app.get("/api/memories",auth,(req,res)=>res.json({memories:memories.get(req.user.id)||[]}));
app.post("/api/memories",auth,(req,res)=>{const text=String(req.body?.content||"").trim();if(!text)return res.status(400).json({error:"Memory trống."});const m={id:uid(),content:text,createdAt:Date.now()};memories.get(req.user.id).push(m);res.json({memory:m})});
app.delete("/api/memories/:id",auth,(req,res)=>{const a=memories.get(req.user.id)||[],i=a.findIndex(x=>x.id===req.params.id);if(i>=0)a.splice(i,1);res.json({ok:true})});
app.delete("/api/memories",auth,(req,res)=>{memories.set(req.user.id,[]);res.json({ok:true})});
app.post("/api/chat",auth,async(req,res)=>{
 if(!gemini)return res.status(503).json({error:"Backend chưa có GEMINI_API_KEY trên Render."});
 const c=(conversations.get(req.user.id)||[]).find(x=>x.id===req.body?.conversationId),text=String(req.body?.message||"").trim(),media=req.body?.media&&typeof req.body.media==="object"?req.body.media:null;
 if(!c)return res.status(404).json({error:"Không tìm thấy cuộc trò chuyện."});if(!text&&!media)return res.status(400).json({error:"Tin nhắn trống."});if(text.length>12000)return res.status(400).json({error:"Tin nhắn quá dài."});
 if(media&&(!/^data:(image\/|video\/)/.test(String(media.dataUrl||""))||String(media.dataUrl).length>12000000))return res.status(400).json({error:"Ảnh/video quá lớn hoặc không hợp lệ."});
 c.messages.push({role:"user",content:text,media:media?{type:media.type,name:String(media.name||"media"),dataUrl:String(media.dataUrl)}:null,createdAt:Date.now()});
 if(c.title==="Cuộc trò chuyện mới")c.title=(text||media?.name||"Tệp đính kèm").slice(0,55);c.updatedAt=Date.now();
 const mem=memories.get(req.user.id)||[],memoryText=mem.length?"\nThông tin người dùng đã lưu:\n"+mem.map(m=>"- "+m.content).join("\n"):"";
 try{
  const contents=c.messages.slice(-20).map(m=>({role:m.role==="assistant"?"model":"user",parts:[...(m.content?[{text:m.content}]:[]),...(m.media&&m.media.type.startsWith("image/")?[{inlineData:{mimeType:m.media.type,data:m.media.dataUrl.split(",")[1]||""}}]:[])]}));
  const r=await gemini.models.generateContent({model:GEMINI_MODEL,contents,config:{systemInstruction:`Bạn là ${AI_NAME} (阮阮), trợ lý AI riêng của YamadaNihon AI. Không tự giới thiệu là ChatGPT. Nếu được hỏi tên, hãy nói tên bạn là 阮阮. Trả lời tự nhiên, hữu ích, phù hợp ngôn ngữ của người dùng.${memoryText}`,maxOutputTokens:1200,thinkingConfig:{thinkingLevel:"MINIMAL"}}});
  const answer=r.text||"Mình chưa tạo được câu trả lời.";c.messages.push({role:"assistant",content:answer,createdAt:Date.now()});c.updatedAt=Date.now();res.json({answer,conversation:{id:c.id,title:c.title,updatedAt:c.updatedAt}});
 }catch(err){c.messages.pop();res.status(502).json({error:"Không gọi được AI lúc này."})}
});
app.use(express.static("public"));app.listen(PORT,"0.0.0.0",()=>console.log(`YamadaNihon AI listening on ${PORT}`));