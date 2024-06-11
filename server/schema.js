import {gql} from "apollo-server"

const typeDefs = gql`
type Query {
   users: [User]
   user(id: ID!): User
   quotes: [QuoteWithName]
   iquote(by: ID!): [Quote]
   myprofile: User
 }
  
 type User{
    id:ID!
    firstname:String!
    lastname:String!
    email:String!
    password:String!
    quotes:[Quote]
 }
 type Quote{
    name:String
    by:ID
 }
 type QuoteWithName{
   name:String
   by:IdName
 }
 type IdName{
   id:ID!
   firstname:String
 }
type Token{
   token:String!
}
type Mutation{
    signupUser(userNew:UserInput!):User
    signinUser(userSignin:UserSignInInput!):Token
    createQuote(name:String!):String
    forgotPassword(email: String!): String
    generateOTP(email: String!): String
    resetPassword(newPassword: String!, otp: String!): String
 }
 input UserInput{
    firstname:String!
    lastname:String!
    email:String!
    password:String!
 }
 input UserSignInInput{
   email:String!
   password:String!
}
`
export default typeDefs