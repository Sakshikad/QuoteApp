import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('authdb','postgres', 'Sakshi@25', {
  dialect: 'postgres',
  host: 'localhost',
});

export default sequelize;

export const JWT_SECRET = "sdasfsdfgdfh";
