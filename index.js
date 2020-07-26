const openpgp = require("openpgp");
const fs = require("fs");
const agriClimePayload = require("./payload");
const axios = require("axios");
const FormData = require("form-data");
const path = require("path");
const { get, uniqueId } = require("lodash");

const handle = (promise) => {
  return promise
    .then((data) => [data, undefined])
    .catch((error) => Promise.resolve([undefined, error]));
};

//will be removed based on encryption findings
var JsonToArray = function (json) {
  var str = JSON.stringify(json, null, 0);
  var ret = new Uint8Array(str.length);
  for (var i = 0; i < str.length; i++) {
    ret[i] = str.charCodeAt(i);
  }
  return ret;
};

const pgpEncrypt = async (payload) => {
  var encryptedKey = await fs.readFileSync("public-key.gpg");
  const keys = (await openpgp.key.read(encryptedKey)).keys;
  const data = await openpgp.encrypt({
    message: openpgp.message.fromText(JSON.stringify(payload, null, 0)),
    publicKeys: keys,
    armor: false,
  });
  // console.log(keys[0].armor()); //print key in text.
  return data.message.packets.write();
};

//will be removed based on encryption findings
function bufferToStream(binary) {
  const readableInstanceStream = new Readable({
    read() {
      this.push(binary);
      this.push(null);
    },
  });

  return readableInstanceStream;
}

// all the commented code will be cleaned based on encryption findings.
const callApi = async () => {
  const formData = new FormData();
  let fileContent = await pgpEncrypt(agriClimePayload);
  formData.append("file", Buffer.from(fileContent));

  // creating the stream and sending it as formdata (fs.createReadstream (line#78) is retruning stream and it is working)
  // let fileContent = await pgpEncrypt(agriClimePayload);
  // let stream = bufferToStream(Buffer.from(fileContent));
  // formData.append("file", stream);

  // mimicing the file post
  // let uniqueId = Math.floor(Math.random() * 9000000000) + 1000000000;
  // console.log(`Newly generated fileName: ${uniqueId}.txt.gpg`);
  // let filename = path.join(__dirname, `output-files/${uniqueId}.txt.gpg`);
  // let fileContent = await pgpEncrypt(agriClimePayload);
  // fs.writeFileSync(filename, fileContent);
  // formData.append("file", fs.createReadStream(filename));

  // posting already encrypted files.
  // formData.append(
  //   "file",
  //   fs.createReadStream("./working-files/payload_aslesh.json.gpg")
  // );

  // formData.append(
  //   "file",
  //   fs.createReadStream("./working-files/payload_encrypted.gpg")
  // );
  let [response, error] = await handle(
    axios.post(
      `https://api-dev.syngenta.com/digital/ga/enroll/v1.0`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    )
  );
  if (error) {
    console.error("error while posting the data to agriclime api");
    throw get(error, "response.data", "response data is null");
  }
  return response.data;
};

(async () => {
  let [response, error] = await handle(callApi());
  error && console.log(error);
  response && console.log(response);
})();
