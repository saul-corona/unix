const { spawn, exec } = require("child_process");

// const subprocess = spawn("ls", ["-l"]);

// subprocess.stdout.on("data", data => {
//   console.log(`stdout: ${data}`);
// });

exec("ls -l", (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
