var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var expressHbs = require('express-handlebars');
var path = require('path');

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 8080;;

// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({
  extended: true
}));
app.use(express.json());
// Make public a static folder
app.use(express.static(path.join(__dirname, 'public')));

app.engine('.handlebars', expressHbs({defaultLayout: 'layout', extname: '.handlebars'}));
app.set('view engine', '.handlebars');

// Connect to the Mongo DB
// mongoose.connect("mongodb://localhost/newsy", { useNewUrlParser: true }); 
// mongoose.connect("mongodb://<dbuser>:<dbpassword>@ds129045.mlab.com:29045/heroku_wfhq17nr", { useNewUrlParser: true }); 
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
// Routes

mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

app.get("/", function (req, res) {
  res.render('index')
});

// // A GET route for scraping the echoJS website
app.get("/scrape", function (req, res) {
  // First, we grab the body of the html with axios
  axios.get("https://www.npr.org/sections/politics/").then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);
    var scraped = [];
    // Now, we grab every h2 within an article tag, and do the following:
    $("article").each(function (i, element) {
      // Save an empty result object

      var result = {};

      result.title = $(this)
        .find(".item-info")
        .find(".title")
        .children("a")
        .text();
      result.desc = $(this)
        .find(".teaser")
        .children("a")
        .text();
      result.imgLink = $(this)
        .find(".imagewrap")
        .children("a")
        .children("img")
        .attr('src');
      result.link = $(this)
        .children(".item-info")
        .children(".title")
        .children("a")
        .attr('href');
      result.date = $(this)
        .find(".date")
        .text();
        if(result.imgLink === undefined) {

        }else {
          scraped.push(result)
        }
        

      // db.Article.create(result)
      //   .then(function(dbArticle) {
      //     // View the added result in the console
      //     console.log(dbArticle);
      //   })
      //   .catch(function(err) {
      //     // If an error occurred, log it
      //     console.log(err);
      //   });
    });


    // Send a message to the client
    res.render('index', {data: scraped});
    
  });
});


app.get("/articles", function (req, res) {
  
  db.Article.find({})
        .then(function (dbArticle) {
          // var tag = []
          //  for(var i of dbArticle) {
          //    tag['tag'] = 'modal-tag' + i._id
          //  }
          //  console.log(dbArticle)
         
          res.render('saved', {data: dbArticle})
        })
        .catch(function (err) {
          // If an error occurred, send it to the client
          console.log(err);
        });
  
});

// Route for getting all Articles from the db
app.post("/save", function (req, res) {
  
  console.log(req.body)

  db.Article.create(req.body)
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      console.log(dbArticle)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      console.log(err);
    });
});

app.put("/delete", function (req, res) {
  
  console.log(req.body.id)

  db.Article.remove({_id:req.body.id})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      console.log(dbArticle)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      console.log(err);
    });
});


app.delete("/delete-all", function (req, res) {


  db.Article.remove({})
    .then(function (dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      console.log("All Deleted")
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      console.log(err);
    });
});

app.put("/delete-note", function (req, res) {
  
  console.log(req.body.id)

  db.Note.remove({_id:req.body.id})
    .then(function (dbNote) {
      // If we were able to successfully find Articles, send them back to the client
      console.log(dbNote)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      console.log(err);
    });
});

app.post("/new-note", function (req, res) {
  
  console.log({'title': req.body.title, 'body': req.body.body}, req.body.artId)

  db.Note.create({'title': req.body.title, 'body': req.body.body})
    .then(function (dbNote) {
      // If we were able to successfully find Articles, send them back to the client
      console.log(req.body.artId)
      return db.Article.findOneAndUpdate({ _id: req.body.artId }, { $push: { note: dbNote._id }}, { new: true });
    }).then(function(dbArticle){
      console.log(dbArticle)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      console.log(err);
    });
});

app.get("/article-notes/:id", function(req, res) {
  console.log(req.params.id)

  

  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client

      console.log(dbArticle)
      
      res.render('listing', {data: dbArticle})
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});
