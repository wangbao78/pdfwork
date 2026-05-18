import { execFile } from "child_process"

execFile(
  "cmd.exe",
  [
    "/c",
    "D:\\LibreOffice\\program\\soffice.exe",
    "--headless",
    "--convert-to",
    "docx",
    "--outdir",
    "D:\\",
    "D:\\hello.pdf",
  ],
  {
    timeout: 30000,
    cwd: "D:\\LibreOffice\\program",
  },
  (err, stdout, stderr) => {
    console.log("ERR:", err?.message || "none")
    console.log("STDOUT:", stdout?.toString() || "none")
    console.log("STDERR:", stderr?.toString() || "none")
  },
)
