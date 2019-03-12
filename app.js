const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const dotenv = require('dotenv');

const result = dotenv.config();
if (result.error) {
  throw result.error;
}

/* eslint-disable no-console, no-process-exit */
const imdb = require('./src/imdb');
const DENZEL_IMDB_ID = 'nm0000243';

//Definition of the connection string
const CONNECTION_URL = "mongodb+srv://" + process.env.DB_USER + ":" + process.env.DB_PASS + "@denzel-oimaf.gcp.mongodb.net/test?retryWrites=true"
const DATABASE_NAME = "IMDB"

//Initialise Express Framework
let app = Express();

//Configure BodyParser package
app.use(BodyParser.json());
app.use(BodyParser.urlencoded({
  extended: true
}));

let database, collection;

//Start listening on port 9292 and connection to MongoDB
app.listen(9292, () => {
  MongoClient.connect(CONNECTION_URL, {
    useNewUrlParser: true
  }, (error, client) => {
    if (error) {
      throw error;
    }
    database = client.db(DATABASE_NAME);
    collection = database.collection("Denzel")
    console.log("Connected to " + DATABASE_NAME + "!");
    console.log("Waiting for requests...");
  })
});

async function populate(actor) {
  try {
    console.log(`📽️  fetching filmography of ${actor}...`);
    return await imdb(actor);
  } catch (e) {
    console.error(e);
  }
}

//GET /movies/populate
app.get("/movies/populate", async (request, response) => {
  const movies = await populate(DENZEL_IMDB_ID);
  collection.insertMany(movies, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      total: result.result.n
    });
  })
})

//GET /movies
app.get("/movies", async (request, response) => {
  let query = {
    "metascore": {
      $gte: 70
    }
  }
  let count = await collection.countDocuments(query);
  let random = Math.floor(Math.random() * count);
  let options = {
    "limit": 1,
    "skip": random
  }
  collection.findOne(query, options, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      id: result.id,
      link: result.link,
      metascore: result.metascore,
      poster: result.poster,
      rating: result.rating,
      synopsis: result.synopsis,
      title: result.title,
      votes: result.votes,
      year: result.year
    });
  })
});

//GET /movies/search
app.get("/movies/search", (request, response) => {
  let query = {
    "metascore": {
      $gte: parseInt(request.query.metascore)
    }
  };
  let options = {
    "limit": parseInt(request.query.limit),
    "sort": [
      ['metascore', 'desc']
    ]
  };
  collection.find(query, options).toArray((error, results) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      limit: parseInt(request.query.limit),
      results: results,
      total: results.length
    });
  })
})

//GET /movies/:id
app.get("/movies/:id", (request, response) => {
  collection.findOne({
    "id": request.params.id
  }, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send({
      id: result.id,
      link: result.link,
      metascore: result.metascore,
      poster: result.poster,
      rating: result.rating,
      synopsis: result.synopsis,
      title: result.title,
      votes: result.votes,
      year: result.year
    });
  })
})

//POST /movies/:id
app.post("/movies/:id", (request, response) => {
  let selector = {
    "id": request.params.id
  };
  let document = {
    $set: request.body
  };
  let options = {
    "upsert": true
  };
  collection.updateMany(selector, document, options, (error, result) => {
    if (error) {
      return response.status(500).send(error);
    }
    response.send(result)
  })
})