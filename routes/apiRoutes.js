const axios = require('axios');
const cheerio = require("cheerio");
const mongoose = require("mongoose");
// Require all models
const db = require("../models");

// Connect to the Mongo DB
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
mongoose.connect(MONGODB_URI, { useNewUrlParser: true });

module.exports = function(app) {
    // home page
    app.get('/', function(req, res) {
        db.Article.find({ saved: false }, function(err, data) {
            res.render('home', { home: true, article: data });
        })
    });

    // saved pages
    app.get('/saved', function(req, res) {
        db.Article.find({ saved: true }, function(err, data) {
            res.render('saved', { home: false, article: data });
        })
    });

    // save article to database by changed saved field to true
    app.put("/api/headlines/:id", function(req, res) {
        var saved = req.body.saved == 'true'
        if (saved) {
            db.Article.updateOne({ _id: req.body._id }, { $set: { saved: true } }, function(err, result) {
                if (err) {
                    console.log(err)
                } else {
                    return res.send(true)
                }
            });
        }
    });

    // delete article from database
    app.delete("/api/headlines/:id", function(req, res) {
        console.log('reqbody:' + JSON.stringify(req.params.id))
        db.Article.deleteOne({ _id: req.params.id }, function(err, result) {
            if (err) {
                console.log(err)
            } else {
                return res.send(true)
            }
        });
    });

    // scrape articles
    // A GET route for scraping the NYT website
    app.get("/scrape", (req, res) => {
        console.log("scrape ran")
            // First, we grab the body of the html with request
        request("https://www.nytimes.com/section/world?action=click&module=Well&pgtype=Homepage", (error, response, body) => {
            if (!error && response.statusCode === 200) {
                // Then, we load that into cheerio and save it to $ for a shorthand selector
                const $ = cheerio.load(body);
                let count = 0;
                // Now, we grab every article:
                $('li.css-ye6x8s').each(function(i, element) {
                    // Save an empty result object
                    let count = i;
                    let result = {};

                    // Add the text and href of every link, and summary and byline, saving them to object
                    result.title = $(element)
                        .find('div.css-4jyr1y')
                        .find('a h2')
                        .text().trim();
                    console.log(result.title);
                    link1 = $(element)

                    .find('div.css-4jyr1y')
                        .find('a')
                        .attr("href");
                    result.link = "https://www.nytimes.com" + link1;
                    console.log(result.link);
                    result.summary = $(element)

                    .find('div.css-4jyr1y')
                        .find('a p')
                        .text().trim();
                    console.log(result.summary)





                    if (result.title && result.link && result.summary) {
                        // Create a new Article using the `result` object built from scraping, but only if both values are present
                        db.Article.create(result)
                            .then(function(dbArticle) {
                                // View the added result in the console
                                count++;
                            })
                            .catch(function(err) {
                                // If an error occurred, send it to the client
                                return res.json(err);
                            });
                    };
                });
                // If we were able to successfully scrape and save an Article, redirect to index
                res.redirect('/')
            } else if (error || response.statusCode != 200) {
                res.send("Error: Unable to obtain new articles")
            }
        });
    });

    // add note to an article
    app.post("/api/notes", function(req, res) {
        console.log(req.body)
        db.Note.create({ noteText: req.body.noteText })
            .then(function(dbNote) {
                console.log('dbNote:' + dbNote)
                return db.Article.findOneAndUpdate({ _id: req.body._headlineId }, { $push: { note: dbNote._id } }, { new: true })
            })
            .then(function(dbArticle) {
                console.log('dbArticle:' + dbArticle)
                res.json(dbArticle)
            })
            .catch(function(err) {
                res.json(err);
            })
    });

    // delete note form article
    app.delete("/api/notes/:id", function(req, res) {
        console.log('reqbody:' + JSON.stringify(req.params.id))
        db.Note.deleteOne({ _id: req.params.id }, function(err, result) {
            if (err) {
                console.log(err)
            } else {
                return res.send(true)
            }
        });
    });

    // clear all articles from database
    app.get("/api/clear", function(req, res) {
        console.log(req.body)
        db.Article.deleteMany({}, function(err, result) {
            if (err) {
                console.log(err)
            } else {
                console.log(result)
                res.send(true)
            }
        })
    });
}