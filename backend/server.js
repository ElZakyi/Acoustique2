const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const port = 5000;

// 🔥 Middleware pour JSON & CORS
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));


// 🔌 Connexion à MySQL
const db = mysql.createConnection(
    {
        host : 'localhost',
        user : 'root',
        password : '',
        database : 'acoustique_db'
    }
)

db.connect((err)=>{
    if(err){
        console.error('❌ Erreur de connexion MySQL :', err.message);
    }else {
        console.log('✅ Connecté à la base de données MySQL');
    }
})

// Route POST pour l’inscription
app.post("/api/utilisateurs",(req,res)=>{
    const {nom,mot_de_passe} = req.body;
    if(!nom || !mot_de_passe){
        return res.status(400).json({message : "champs manquant"});
    }
    const checkSql = "SELECT * FROM utilisateur WHERE nom = ? AND mot_de_passe = ?";
    db.query(checkSql,[nom,mot_de_passe],(err,results)=>{
        if(err){
            console.err("Erreur lors de la verification : ",err);   
            return res.status(500).json({message: "Erreur Serveur"});
        }
        if(results.length>0){
            return res.status(409).json({message:"ce compte est déja créé ! "});
        }
        const sql = "INSERT INTO utilisateur (nom,mot_de_passe) VALUES (?,?)";
        db.query(sql,[nom,mot_de_passe],(err,result)=>{
        if(err){
            console.error("Erreur lors de l'inscription :",err);
            return res.status(500).json({message:"Erreur serveur"});
        }
        return res.status(200).json({message:"Utilisateur créé avec succés !!"});
    });
    })
});
// ✅ Route POST pour la connexion
app.post("/api/connexion",(req,res)=>{
    const {nom,mot_de_passe} = req.body;
    if(!nom || !mot_de_passe){
        return res.status(400).json({message:"champs manquant"});
    }
    const sql = "SELECT * FROM utilisateur WHERE nom = ? AND mot_de_passe = ? ";
    db.query(sql,[nom,mot_de_passe],(err,results)=>{
        if(err) {
            console.error("Erreur lors de la connexion : ",err);
            return res.status(500).json({message : "Erreur serveur"});
        }
        if(results.length>0){
            return res.status(200).json({message:"connexion reussi",utilisateur : results[0]});
        }
        else {
            return res.status(401).json({message:"identifiant ou mot de passe incorrect"});
        }
    })
})

app.listen(port,()=>{
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
})