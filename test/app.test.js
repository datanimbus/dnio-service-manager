// var assert = require('assert');
// var sinon = require('sinon');
// require('sinon-mongoose');
// var SwaggerExpress = require('swagger-express-mw');
// var mongoose = require("mongoose");
// var cron = require('node-cron');

// describe("Testing app.js", function() {

//     var promiseResolve = sinon.fake.resolves();
//     var promiseRejects = sinon.fake.rejects(new Error("Connection error"));
//     var fakeFun = sinon.fake();

//     before(() => {
//         sinon.stub(mongoose, "connect").callsFake(promiseResolve);
//         sinon.stub(cron, "schedule").callsFake(promiseResolve);
//         sinon.stub(SwaggerExpress, "create").callsFake(promiseResolve);
//     });

//     after(() => {
//         sinon.restore();
//     });

//     beforeEach(() => {});

//     afterEach(() => {});

//     it('app init', function(done) {
//         this.timeout(5000);
//         require("../app");
//         setTimeout(done, 2000);
//         // assert("Success")
//     });
// });