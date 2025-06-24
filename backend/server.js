const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const port = 5000;

// 🔥 Middleware pour JSON & CORS
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST','DELETE', 'PUT', 'OPTIONS'],
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
});

// Route POST pour l’inscription
app.post("/api/utilisateurs",(req,res)=>{
    const {email,mot_de_passe} = req.body;
    if(!email || !mot_de_passe){
        return res.status(400).json({message : "champs manquant"});
    }
    const checkSql = "SELECT * FROM utilisateur WHERE email = ? ";
    db.query(checkSql,[email],(err,results)=>{
        if(err){
            console.err("Erreur lors de la verification : ",err);   
            return res.status(500).json({message: "Erreur Serveur"});
        }
        if(results.length>0){
            return res.status(409).json({message:"cet email est déja utilisé ! "});
        }
        const sql = "INSERT INTO utilisateur (email,mot_de_passe) VALUES (?,?)";
        db.query(sql,[email,mot_de_passe],(err,result)=>{
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
    const {email,mot_de_passe} = req.body;
    if(!email || !mot_de_passe){
        return res.status(400).json({message:"champs manquant"});
    }
    const sql = "SELECT * FROM utilisateur WHERE email = ? AND mot_de_passe = ? ";
    db.query(sql,[email,mot_de_passe],(err,results)=>{
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
    });
});

//recuperation de toutes les affaires 
app.get("/api/affaires",(req,res)=>{
    const sql = "SELECT * FROM affaire";
    db.query(sql,(err,result)=>{
        if(err){
            console.error("Erreur lors de recuperation des affaires : ",err);
            return res.status(500).json({message:"Erreur serveur"});
        }
        return res.status(200).json(result);
    });
});


// Route POST pour créer une nouvelle affaire
app.post('/api/affaires', (req, res) => {
  // 1. On récupère les données envoyées par le formulaire via req.body
  const { objet, client, responsable, numero_affaire, observation, id_utilisateur } = req.body;

  // 2. On fait une petite validation pour s'assurer que les champs importants ne sont pas vides
  if (!objet || !client || !numero_affaire) {
    return res.status(400).json({ message: "Les champs 'objet', 'client' et 'numero_affaire' sont obligatoires." });
  }

  // 3. On prépare la requête SQL pour l'insertion
  // Les '?' sont des "placeholders" pour éviter les injections SQL, c'est une bonne pratique de sécurité.
  const sql = "INSERT INTO affaire (objet, client, responsable, numero_affaire, observation, id_utilisateur) VALUES (?, ?, ?, ?, ?, ?)";
  
  const values = [
    objet,
    client,
    responsable, 
    numero_affaire,
    observation,
    id_utilisateur
  ];

  // 4. On exécute la requête sur la base de données
  db.query(sql, values, (err, result) => {
    // S'il y a une erreur avec db
    if (err) {
      console.error("Erreur lors de la création de l'affaire :", err);
      return res.status(500).json({ message: "Erreur serveur lors de la création de l'affaire." });
    }    
    // On renvoie un statut 201 (Created) et un objet JSON avec les infos
    res.status(201).json({ 
      message: "Affaire créée avec succès !",
      id_affaire: result.insertId,
      ...req.body 
    });
  });
});

// Supprimer une affaire par ID
app.delete('/api/affaires/:id',(req,res)=>{
    const {id} = req.params;
    const sql = "DELETE FROM affaire WHERE id_affaire = ?";
    db.query(sql,[id],(err,result)=>{
        if(err){
            console.error("Erreur lors de supression de l'affaire : ",err);
            return res.status(500).json({message : "Erreur serveur"});
        }
        if(result.affectedRows === 0){
            return res.status(404).json({message:"Affaire non trouvé"});
        }
        return res.status(200).json({message:"Affaire supprimée avec succès !"})
    });
});
// Mettre à jour une affaire par ID
app.put('/api/affaires/:id',(req,res)=>{
    const {id} = req.params;
    const { objet, client, responsable, numero_affaire, observation } = req.body;
    const sql = "UPDATE affaire SET objet = ?, client = ?, responsable = ?, numero_affaire = ?, observation = ? WHERE id_affaire = ?";
    db.query(sql,[objet,client,responsable,numero_affaire,observation,id],(err,result)=>{
        if(err){
            console.error("error lors de la modification de l'affaire : ",err);
            return res.status(500).json({message : "erreur serveur lors de la mise a jour "});
        }
        return res.status(200).json({message : "Affaire modifié avec succés ! "});
    });
});

// Liste des salles d'une affaire spécifique
app.get('/api/affaires/:id_affaire/salles', (req, res) => {
  const { id_affaire } = req.params;
  const sql = "SELECT * FROM salle WHERE id_affaire = ?";

  db.query(sql, [id_affaire], (err, result) => {
    if (err) {
      console.error("Erreur lors de la récupération des salles :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    return res.status(200).json(result);
  });
});

//inserer une salle dans une affaire 
app.post('/api/affaires/:id_affaire/salles', (req, res) => {
  const { id_affaire } = req.params;
  const { longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, surface_totale } = req.body;

  if (!longueur || !largeur || !hauteur || !tr ) {
    return res.status(400).json({ message: "Tous les champs sont obligatoires." });
  }

  const sql = `
    INSERT INTO salle 
    (longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [longueur, largeur, hauteur, surface, volume, tr, a_moyenne, r, id_affaire, surface_totale];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erreur lors de l'insertion de la salle :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }
    res.status(201).json({ message: "Salle insérée avec succès !", id_salle: result.insertId });
  });
});



app.listen(port,()=>{
    console.log(`🚀 Serveur lancé sur http://localhost:${port}`);
});