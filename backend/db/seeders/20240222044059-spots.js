'use strict';
const { Spot } = require('../models');
const bcrypt = require("bcryptjs");

let options = {};
if (process.env.NODE_ENV === 'production') {
  options.schema = process.env.SCHEMA;  // define your schema in options object
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Doe',
     *   isBetaMember: false
     * }], {});
    */
    await Spot.bulkCreate([
      {
        ownerId: 1,
        address: "55 Valleywood Rd",
        city: 'Cos Cob',
        state: 'CT',
        country: 'USA',
        lat: -73.60338,
        lng: 41.04158,
        name: 'Cos Cob Rental',
        description: 'Small house that is the same as it was in the 90s',
        price: 50
      },
      {
        ownerId: 1,
        address: "37 Allen Ave",
        city: 'Ross',
        state: 'CA',
        country: 'USA',
        lat: -122.5584473,
        lng: 37.9600466,
        name: 'House in Marin',
        description: 'A lot of space for one story',
        price: 50
      },
      {
        ownerId: 1,
        address: "Via Nazionale, 107/A, 98039 Isola Bella, ME, Italy",
        city: 'Taormina',
        state: 'Metropolitan City of Messina',
        country: 'Italy',
        lat: 15.2928363,
        lng: 37.8504709,
        name: 'Hotel in Taormina',
        description: 'Prettiest Spot You Will Ever Be',
        price: 50
      }
    ], { validate: true });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    options.tableName = 'Spots';
    const Op = Sequelize.Op;
    return queryInterface.bulkDelete(options, {
      id: { [Op.in]: [1, 2, 3] }
    }, {});
  }
};
