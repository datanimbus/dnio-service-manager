"use strict";
const _ = require("lodash");
const logger = global.logger;


async function updateExistingServicesWithDefaultConnectors() {
  try {
    logger.info(`=== Updating existing services with default connectors ===`);
    let servicesAndConnector = await global.mongoConnection
      .db("datastackConfig")
      .collection("services")
      .aggregate([
        {
          $lookup: {
            from: "config.connectors",
            localField: "app",
            foreignField: "app",
            as: "appConnectorData",
          },
        },
        {
          $match: {
            appConnectorData: { $ne: [] },
            connectors: { $exists: false },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            app: 1,
            appConnectorData: 1
          },
        },
      ])
      .toArray(); 
    let updateQueryDataAndCondition = {};
    if (!_.isEmpty(servicesAndConnector)) {
      servicesAndConnector.map((service) => {
        if (updateQueryDataAndCondition.hasOwnProperty(service.app)) {
          let temp = updateQueryDataAndCondition[service.app];
          temp.query.$and[1]._id.$in.push(service._id);
          updateQueryDataAndCondition[service.app] = temp;
        } else {
          //{ $and: [ { app : "Adam" } , { _id: { $in: [ "1","2" ] } } ] }
          //{ $set: { "connectors": service.connector } }
          let tempconnectorIDs = { data: {}, file: {} };
          tempconnectorIDs.file._id = _.find(service.appConnectorData, {
            category: "STORAGE",
            options: { default: true },
          })._id;
          tempconnectorIDs.data._id = _.find(service.appConnectorData, {
            category: "DB",
            options: { default: true },
          })._id;
          updateQueryDataAndCondition[service.app] = {
              query: {
                $and: [{ app: service.app }, { _id: { $in: [service._id] } }],
              },
              data: { $set: { connectors: tempconnectorIDs } }
          };
        }
      });
      await Object.keys(updateQueryDataAndCondition).forEach(async function (key) {
        let updateResult = await global.mongoConnection
          .db("datastackConfig")
          .collection("services")
          .updateMany(updateQueryDataAndCondition[key].query, updateQueryDataAndCondition[key].data);
      });
    }
  } catch (err) {
    logger.error(
      "=== Error while updating services with default connectors ===\n" +
        err.message
    );
  }
}

function init() {
  return updateExistingServicesWithDefaultConnectors();
}

module.exports = init;
