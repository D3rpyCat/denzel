const Express = require("express");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const dotenv = require('dotenv');
const graphqlHTTP = require("express-graphql");
const gql = require('graphql-tag');
const {
  buildASTSchema
} = require("graphql");

const movie = dotenv.config();
if (movie.error) {
  throw movie.error;
}

/* eslint-disable no-console, no-process-exit */
const imdb = require('./src/imdb');
const DENZEL_IMDB_ID = 'nm0000243';

//Definition of the connection string
const CONNECTION_URL = "mongodb+srv://" + process.env.DB_USER + ":" + process.env.DB_PASS + "@denzel-oimaf.gcp.mongodb.net/test?retryWrites=true"
const DATABASE_NAME = "IMDB"

//GraphQL schema
const schema = buildASTSchema(gql `
  type Query {
    populate: Populate
    random: Movie
    getMovie(id: String) : Movie
    getMovies(metascore: Int, limit: Int): [Movie]
    postReview(id: String, review: Review): Movie
  },
  type Movie {
    link: String
    id: String
    metascore: Int
    poster: String
    rating: Float
    synopsis: String
    title: String
    votes: Float
    year: Int
    date: String
    review: String
  },
  type Populate{
    total: String
  },
  input Review{
    date: String
    review: String
  }
`)

const root = {
  populate: async (source, args) => {
    const movies = await populate(DENZEL_IMDB_ID);
    const insertion = await collection.insertMany(movies);
    return {
      total: insertion.movie.n
    };
  },
  random: async () => {
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
    const movie = await collection.findOne(query, options);
    return movie;
  },
  getMovie: async (args) => {
    const movie = await collection.findOne({
      "id": args.id
    });
    return movie;
  },
  getMovies: async (args) => {
    let query = {
      "metascore": {
        $gte: args.metascore
      }
    };
    let options = {
      "limit": args.limit,
      "sort": [
        ['metascore', 'desc']
      ]
    };
    const movies = await collection.find(query, options).toArray();
    return movies;
  },
  postReview: async (args) => {
    let selector = {
      "id": args.id
    };
    let document = {
      $set: args.review
    };
    let options = {
      "upsert": true
    };
    const post = await collection.updateMany(selector, document, options)
    const modified = await collection.findOne(selector);
    return modified;
  }
}

async function populate(actor) {
  try {
    console.log(`📽️  fetching filmography of ${actor}...`);
    return await imdb(actor);
  } catch (e) {
    console.error(e);
  }
}

//Initialise Express Framework
let app = Express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true
}))

let database, collection;

//Start listening on port 9292 and connection to MongoDB
app.listen(9292, () => {
  console.log("Running a GraphQL API server at localhost:9292/graphql");
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