/**
 * This module will take care of all the IO operations 
 * 
 */

const fs = require(`fs-extra`);
const log4js = require(`log4js`);
const logger = log4js.getLogger(`CodeGen`);
var e = {};
e.readFile = function (_id,notJson){
	return new Promise((resolve,reject) =>{
		fs.stat(_id,(err,stats) => {
			fs.open(_id,`r`,(err, fd) => {
				if(err){
					reject(err);
				}
				else{
					var buffer = new Buffer(stats.size);
					fs.read(fd, buffer,0, buffer.length, null, function(error, bytesRead, buffer){
						if(error){
							reject(error);
						}
						else{
							var data = buffer.toString();
							try{
								data = notJson?data:JSON.parse(data);
								logger.info(`Config file read complete`);
								resolve(data);
							}
							catch(err){
								reject(err);
							}
						}
					});
				}
			});
		});
	});
};


e.writeFile = function (path, data){
	return new Promise((resolve,reject) => {
		fs.writeFile(path, data, { flag: `wx` }, err => {
			if(err)
				reject(err);
			else
				resolve();
		});
	});
};

e.removeFile = function (path){
	return new Promise((resolve,reject)=>{
		fs.unlink(path,(err)=>{
			if(err)
				reject(err);
			else
				resolve();
		});
	});
};

e.deleteFolderRecursive = function(path) {
	fs.removeSync(path);
};

module.exports = e;