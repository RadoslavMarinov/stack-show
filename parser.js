/* CLASSES */
class fileText{
	constructor(){
		this.str = "";
		this.hexStrArr = []; //Can be manipulated as number
		this.frames = {}; //Facilitates parsing
	}
}

/* VARIABLES */
fs = require('fs');
var utilFs = require('./modules/utilities/file-system/file-system.js');
var utils = require('./modules/utilities/utilities.js');
var utilGlob = require("./modules/utilities/glob/glob.js");
var isCrcOk = require('./modules/crc16ccitt/crc16ccitt.js').isCrcOk;
var utilRegex = require('./modules/utilities/regex/regex.js');
var xpath = require("./modules/xpath/xpath.js")
var file = new fileText();
var date = new Date();
var xmlFileStr = ""; 
var frameObjects = {commands:[], tods:[]};
var log = console.log;
var todXmlFile;

const INPUT_FILE_NAME = "i.txt";
const OUTPUT_FILE_NAME = "report.txt";
const OUTPUT_FILE_OBJECTS = "objects.txt";
const READ_M_TODS = 0xCD;
const READ_M_TODS_ANSWER = 0x32;
const WRITE_M_TODS = 0xDD;
const REPORT_UNIQUE_PROPERTIES = "all";

/* EXPORT */
module.exports={
	fileStr: file.str
}

/* FUNCTION CALL */

// log(utilGlob.getFileNames("./xml/*"));
// getTodFileName("./xml/*.xml");


utilGlob.getFileNames("./xml/*.xml", filesFound_cb);

function filesFound_cb(err, matches)
{
	if(err)
	{
		console.log(err.message)
	}
	else
	{
		console.log(matches);
		if(matches[1] != undefined)
		{
			console.log("ERROR: There must be only one ToD file in \'./xml\'");
			process.exit(1);
		}
		todXmlFile = matches[0].toString();
		utilFs.readFromFile(todXmlFile, 'xmlFileReady');
	}	
}


//listeners
utilFs.events.addListener('xmlFileReady', readXml_cb);
utilFs.events.addListener('logFileReady', refineLogFile_cb);


// 

function readXml_cb(){
	xmlFileStr = utilFs.getFileContent();
	xpath.createDom(xmlFileStr);
	utilFs.readFromFile(INPUT_FILE_NAME, 'logFileReady');
}

function refineLogFile_cb(){
	file.str = utilFs.getFileContent();
	main();
}

function main()
{
	deleteIfExistFile(OUTPUT_FILE_OBJECTS);	//Needs to be done before appending to the file. 
	file.hexStrArr = createHexStringArray(file.str);

	file.frames = getFrames(file.hexStrArr);
	createParsedFile(getFileString(file.frames))
	if(utils.hasCommandLineArgument(REPORT_UNIQUE_PROPERTIES)){
		reportObjects();	
	}
}

function getFileString(frames)
{
	var str = "";
	for(var frame in frames)
	{
		str += getFrameParsedStr(frames[frame]) + "\n";  //Append human readable information
		str += getFrameRawDataStr(frames[frame]); //With tendency to be eliminated in the future  
		str += "\n";
	}
	return str;
}

function reportObjects(){
	var str = "";
	str += getCommandObjects() + getTodObjects();
	function getTodObjects() {
		var todStr = "TOD OBJECTS:\n";
		for(var i=0; i<frameObjects.tods.length; i++){
			todStr += frameObjects.tods[i].toString() + "\n";
		}
		return todStr; 
	}
	function getCommandObjects() {
		var commandStr = "COMMAND OBJECTS:\n";
		for(var i=0; i<frameObjects.commands.length; i++){
			commandStr += frameObjects.commands[i].toString() + "\n";
		}
		return commandStr;
	}
	utilFs.append2File(OUTPUT_FILE_OBJECTS, str);
}

function getFrameParsedStr(frame){
	var str = "";
	var command = frame[0];
	str += getCommandId(frame)+ "; \n";
	if(frameHasToDs(frame))
	{
		var todArray = getArrayOfToDs(frame);
		for (var i = 0; i < todArray.length; i++) {
			str += getParsedTodStr(todArray[i]) + '\n';
		}
	}
	// str += getTodString(frame);
	addCommandId2UniquePropertiesObject(getCommandId(frame));
	str += checkCrc(frame);
	return str;
}




function getParsedTodStr(tod){
	var objectAddress = (tod[0] << 8) | tod[1];
	var attributeAddress = (tod[2] << 8) | tod[3];		
	str = "";

	var zoneDependent = (objectAddress & (1 << 11)) ? true : false;
	str += "FU: " +(objectAddress >> 12) + "; ";
	// if(zoneDependent)
	// {
	// 	str += "Zone: " + ((objectAddress >> 6) & 0x1F) + "; ";
	// 	str += "Object: " + ((objectAddress) & 0x3F) + "; ";
	// }
	// else
	// {
	// 	str += "Object: " + (objectAddress & 0x7FF) + "; ";
	// }
	
	/* Attribute Address */
	if(attributeAddress & (1<<15))
	{
		str += "Access: (16bit); "; 
	}
	else
	{
		str += "Access: (8bit); ";	
	}
	var classifierValue = (attributeAddress >> 11) & 0x0F;
	// str += "CVal: " + classifierValue + "; ";
	str += "Classifier: " + getClassifierStr(classifierValue) + "; "
	// var attribute = attributeAddress & 0x7FF;
	// str += "AttrAddress: " + getHex(attribute) + "; ";
	// if(tod.length == 6)
	// {
	// 	var val = (tod[4]*256) + tod[5];
	// 	str += "Value: " + "0x" + val + ", ";
	// }
	str += getXmlData(getTodObject(tod));
	// str += getXpathStrFrom(getTodObject(tod));
	return str;
}

function getXmlData(todObj)
{
	var xpathStr = 	getXpathStrFrom(todObj);
	var unitZoneNode = xpath.getNode(xpathStr + "/parent::unit/@zone");
	var unitZoneValue_s = "";
	if(unitZoneNode == undefined){
		unitZoneNode = "no-such-zone"
	}
	else if(unitZoneNode[0] == undefined){
		console.log(unitZoneNode)
		unitZoneValue_s = "no-such-zone"	
		// unitZoneNode = unitZoneNode[0].value;	
	}
	else{
		unitZoneValue_s = unitZoneNode[0].value.toString();	
	}

	var objNameNode = xpath.getNode(xpathStr + "/@name");
	var objNameNodeValue_s = "";
	// console.log(unitZoneNode);
	if(objNameNode == undefined){
		objNameNode = "no-such-object";
	}
	else if(objNameNode[0] == undefined){
		objNameNodeValue_s = "no-such-object";
	}
	else{
		objNameNodeValue_s = objNameNode[0].value.toString();
	}

	addAttributes2UniquePropertiesObject(objNameNodeValue_s);

	if(todObj.value != undefined)
		return  unitZoneValue_s + " : " + objNameNodeValue_s + " = " + getHex(todObj.value);
	else
		return unitZoneValue_s + " : " + objNameNodeValue_s;
}

//Returns ToD address in objects with lpf compatible values 
function getTodObject(tod){
	var objectAddress = (tod[0] << 8) | tod[1];
	var attributeAddress = (tod[2] << 8) | tod[3];
	var todObj = {};
	//<Unit/> Part
	todObj.fu_address= (objectAddress >> 12) & 0x0F;
	todObj.zoneDependent = (objectAddress & (1 << 11)) ? 1 : 0;	//this object does not correspond to XML node
	if(todObj.zoneDependent == 1)
	{
		todObj.zaddress = ((objectAddress >> 6) & 0x1F);
		todObj.zone = getZoneAttribute(todObj.zaddress);
		todObj.oaddress = ((objectAddress) & 0x3F);
	}	
	else
	{
		todObj.zaddress = 0;
		todObj.zone = 0;
		todObj.oaddress = (objectAddress & 0x7FF);
	}
	//<Object/> Part
	if(attributeAddress & (1<<15))
	{
		todObj.size = "16 Bit"; 
	}
	else
	{
		todObj.size = "8 Bit";	
	}
	todObj.classifier = getClassifierStr((attributeAddress >> 11) & 0x0F);
	todObj.ToD_address = getFormatedToDAddress(attributeAddress & 0x7FF);
	function getFormatedToDAddress(ToDAddress)
	{
		if(ToDAddress < 0x10){
			return "0x000"+ToDAddress.toString(16).toUpperCase();
		}
		else if(ToDAddress < 0x100){
			return "0x00"+ToDAddress.toString(16).toUpperCase();	
		}
		else if(ToDAddress < 0x1000){
			return "0x0"+ToDAddress.toString(16).toUpperCase();	
		}
		else{
			return "0x"+ToDAddress.toString(16).toUpperCase();	
		}
	}
	if(tod.length == 6){
		todObj.value = (tod[4]*256) + tod[5];
	}
	return todObj;
}

function getCommandId(frame){
	var str = "";
	var command=frame[0];
	switch(command){
		case 0xCD:
			str = "Read M ToDs";
			break;
		case 0x32:
			str = "Answer - Read M ToDs"
			break;
		case 0x25:
			str = "Get Version";
			break;
		case 0xDA:
			str = "Answer - Get Version";
			break;
		case 0x7D:
			str = "Get Slave Request";
			break;
		case 0x82:
			str = "Answer - Get Slave Request";
			break;
		case 0xDD:
			str = "Write M ToDs";
			break;
		case 0x22:
			str = "Answer - Write M ToDs";
			break;
	}
	return str;
}


function getZoneAttribute(zaddress){
	var str = "";
	switch(zaddress){
		case 0:
			str = "0";
			break
		case 2:
			str = "zEWB"
			break;
		case 4:
			str = "zWZL";
			break;
		case 15:
			str = "zBT";	
			break;
		case 16:
			str = "zKT";	
			break;
		case 17:
			str = "zGT";
			break;
		case 18:
			str = "zVB";
			break;
		case 19:
			str = "zKTB";
			break;
		case 21:
			str = "zW1";
			break;
		case 22:
			str = "zW2";
			break;
		case 23:
			str = "zW3";
			break;
		case 27:
			str = "zSG";
			break;
		case 28:
			str = "zSDB";
			break;
		case 29:
			str = "zEWD";
			break;
		case 30:
			str = "zCWD";
			break;
		case 31:
			str = "zBG";
			break;
		default:
			str = "no-such-zone";
			break;
	}
	return str;
}

function getXpathStrFrom(todParsedObj) {
	// body...
	var xpathStr = "";
	xpathStr += "//unit[@zone=\'" + todParsedObj.zone + "\' and @zaddress=\'" + todParsedObj.zaddress + "\' and @oaddress=\'" + todParsedObj.oaddress + "\']";
	xpathStr+="/object[@size=\'"+todParsedObj.size+"\' and @ToD_address=\'"+todParsedObj.ToD_address+"\' and @classifier=\'"+todParsedObj.classifier+"\']";
	return xpathStr;
}

function getClassifierStr(classifierValue){
	// console.log(classifierValue);
	var str = "";
	switch(classifierValue){
		case 0:
			str = "parameter";
			break;
		case 1: 
			str = "command";
			break;
		case 2:
			str = "value";
			break;
		case 3:
			str = "nv_value";
			break;
		case 4:
			str = "state";
			break;
		case 5:
			str = "nv_state";
			break;
		case 6:
			str = "configuration";
			break;
		case 7:
			str = "future-use";
			break;
		case 8:
			str = "diehl_parameter";
			break;
		case 9:
			str = "diehl_command";
			break;
		case 10:
			str = "diehl_value";
			break;
		case 11:
			str = "diehl_nv_value";
			break;
		case 12:
			str = "diehl_state";
			break;
		case 13:
			str = "diehl_nv_state";
			break;
		case 14:
			str = "diehl_configuration";
			break;
		case 15:
			str = "future-use";
			break;
		default: 	//Doesnt fit in 4bit number
			str = "Error";
	}
	return str;
}

function getFrames(hexArr)
{
	var frames = {};
	var i=0,j=0,frameNumber = 0;
	
	
	
	loop1:
	while(j < hexArr.length)
	{
		payloadSize = parseInt(hexArr[j+2], 16);
		if(isNaN(payloadSize)){	//hexArr[j+2] doesnt exist. This happens at the end of the array.
			console.log("Not a complete frame: " + hexArr[j-2] + " " + hexArr[j-1] + " " + hexArr[j]);
			return frames;
		}
		frames["frame" + frameNumber] = new Array(payloadSize);

		loop2:
		for(i = 0; i < (payloadSize + 5); i++)
		{

			if(hexArr[i+j] == null)
			{
				console.log("undefined character");

				delete frames["frame"+frameNumber]; //last object is incomplete. Size bigger than real data.
				break loop1;
			}
			
			else
			{
				frames["frame"+frameNumber][i] = parseInt(hexArr[i+j], 16);
			}

		}
		j += i;
		frameNumber++;
	}
	return frames;
}



function checkCrc(frame){
	var str = "";
	if(isCrcOk(frame))
		str+="CRC is OK ";
	else
		str+="BAD CRC ";
	return str;	
}

function createHexStringArray(str)
{
	var hexStrArr = [];
	for(var i = 0; i < str.length; i+=3)
	{
		hexStrArr.push("0x"+str.substr(i,2));
	}
	return hexStrArr;
}

function getHex(number){
	var str = "";
	if(number < 16)
		str = "0x0" + number.toString(16).toUpperCase();
	else 
		str = "0x" + number.toString(16).toUpperCase();
	return str;
}

function deleteIfExistFile(fileName){
	if(fs.existsSync(fileName)){
		fs.unlink(fileName, function(err){
			if(err){
				console.log("EXEPTION!")
				console.log(err);	
			}
			else{
				console.log("File removed!")
			}
		});
	}
}



function splitInBytes(str){
	str = str.replace(/[\r\n]+/g, " ").replace(/([0-9a-f]{2})([0-9a-f]{2})/g, "$1 $2");
	return str;
}

function removeGarbage(str){

	str  = str.replace(/.{2}/,"");
	return str;
}

function getData(){
	var hour = date.getHours();
    hour = (hour < 10 ? "0" : "") + hour;

    var min  = date.getMinutes();
    min = (min < 10 ? "0" : "") + min;

    var sec  = date.getSeconds();
    sec = (sec < 10 ? "0" : "") + sec;

    var year = date.getFullYear();

    var month = date.getMonth() + 1;
    month = (month < 10 ? "0" : "") + month;

    var day  = date.getDate();
    day = (day < 10 ? "0" : "") + day;
    return year + "-" + month + "-" + day + "_" + hour + "-" + min + "-" + sec;
}

function frameHasToDs(frame){
	var command = frame[0];
	if( (command == READ_M_TODS) ||(command == READ_M_TODS_ANSWER) || (command == WRITE_M_TODS) )
		return true;
	else
		return false;
}

function getArrayOfToDs(frame){	
	var command = frame[0];
	var todArray = [];
	if(command == READ_M_TODS)
	{
		for(var i = 3; i < (frame.length - 2); i += 4 )
		{
			var currentToD = frame.slice(i, i + 4);
			todArray.push(currentToD);
		}
		return todArray;
	}
	else if((command == READ_M_TODS_ANSWER) || (command == WRITE_M_TODS))
	{
		for(var i = 3; i < (frame.length - 2); i += 6)
		{
			var currentToD = frame.slice(i, i + 6);	
			todArray.push(currentToD);;
		}
		return todArray;
	}
	else return false;
}

function createParsedFile(str) {
	var dateStr = getData();
	utilFs.append2File(dateStr + ".txt", str);
}

function getFrameRawDataStr(frame) {
	var str = "";
	for(var i=0; i < frame.length; i++)
	{
		str += frame[i].toString(16).toLowerCase() + " ";
	}
	return str;
}

function addAttributes2UniquePropertiesObject(nodeValue)
{
	if(utils.stringDoesExistInArray(nodeValue, frameObjects.tods) == false){
		frameObjects.tods.push(nodeValue);
		console.log(nodeValue);
	}
}

function addCommandId2UniquePropertiesObject(commandIdStr)
{
	if(!utils.stringDoesExistInArray(commandIdStr, frameObjects.commands)){
		console.log(commandIdStr);
		frameObjects.commands.push(commandIdStr);
	}	
}


//if(utils.hasCommandLineArgument(REPORT_UNIQUE_PROPERTIES))