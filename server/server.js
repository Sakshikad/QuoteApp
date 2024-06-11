import { ApolloServer } from 'apollo-server';
import { ApolloServerPluginLandingPageGraphQLPlayground } from 'apollo-server-core';
import typeDefs from './schema.js';
import sequelize, { JWT_SECRET } from './config.js';
import jwt from 'jsonwebtoken';
import resolvers from './resolvers.js';

// Middleware
const context=({req})=>{
  const{authorization}=req.headers
  if(authorization){
    const {userId} = jwt.verify(authorization,JWT_SECRET)
    return {userId}
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context,
  plugins: [ApolloServerPluginLandingPageGraphQLPlayground()],
});

sequelize.authenticate()
  .then(() => {
    server.listen().then(({ url }) => {
      console.log(`🚀 Server ready at: ${url}`);
      console.log('Connection to the database has been established successfully.');
    });
  })
  .catch((err) => {
    console.error('Unable to connect to the database:', err);
  });
