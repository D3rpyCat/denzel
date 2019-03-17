const Express = require("express");
const MongoClient = require("mongodb").MongoClient;
const ObjectID = require("mongodb").ObjectID;
const dotenv = require('dotenv');
const graphqlHTTP = require("express-graphql");
const gql = require('graphql-tag');
const {
  buildASTSchema
} = require("graphql");

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

//GraphQL schema
const schema = buildASTSchema(gql `
  type Query {
    hello: String
    populate: String
    random: Movie
    movies: [Movie]
    movie: Movie
  },
  type Movie {
  link: String
  metascore: Int
  synopsis: String
  title: String
  year: Int
  }
`)

const root = {
  hello: () => "Hello!",
  populate: async (source, args) => {
    const movies = await populate(DENZEL_IMDB_ID);
    collection.insertMany(movies, (error, result) => {
      if (error) {
        return error;
      }
      return result.result.n;
    });
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
    collection.findOne(query, options, (error, result) => {
      if (error) {
        return error;
      }
      return new Movie(result.link, result.metascore, result.synopsis, result.title, result.year);
    })
  },
  movie: (source, args) => {},
  movies: (source, args) => {},
}

class Movie {
  constructor(link, metascore, synopsis, title, year) {
    this.link = link;
    this.metascore = metascore;
    this.synopsis = synopsis;
    this.title = title;
    this.year = year;
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