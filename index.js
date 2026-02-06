#!/usr/bin/env node

const https = require("https");
const readline = require("readline");
const { execSync } = require("child_process");

const API_KEY = "sk-b41fca1fa4a14e969b635719844078f6";
const CWD = process.cwd();

function spinner(text) {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const id = setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]} ${text}`);
  }, 80);
  return () => {
    clearInterval(id);
    process.stdout.write("\r" + " ".repeat(text.length + 4) + "\r");
  };
}

const tools = [
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to execute" },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file. Use mode='write' to create/overwrite, mode='append' to append.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to CWD" },
          content: { type: "string", description: "Content to write" },
          mode: { type: "string", enum: ["write", "append"], description: "write or append" },
        },
        required: ["path", "content"],
      },
    },
  },
];

const messages = [
  {
    role: "system",
    content: `Bạn là Web Designer AI chuyên nghiệp. CWD: ${CWD}

NĂNG LỰC: Thiết kế website hiện đại, responsive dùng HTML, Vanilla CSS, Vanilla JS.

TOOLS:
- run_command: chạy shell command (mkdir, ls, etc.)
- write_file: tạo/ghi file (path, content, mode=write|append)

QUY TRÌNH TẠO WEBSITE:
1. PLAN: Phân tích yêu cầu, liệt kê file cần tạo. Dùng run_command mkdir -p tạo folder.
2. BUILD: Tạo từng file bằng write_file (mode="write"). Mỗi bước chỉ tạo 1 file.
3. SPLIT: Nếu file dài (>150 dòng), chia nhỏ:
   - Phần 1: mode="write"
   - Phần 2+: mode="append"
4. VERIFY: Chạy ls -la xác nhận.

THIẾT KẾ:
- Mobile-first responsive
- CSS custom properties cho colors
- Semantic HTML5
- Smooth animations/transitions
- Professional typography/spacing

QUAN TRỌNG: Luôn tạo file thực tế bằng tools, không chỉ hiển thị code.`,
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function runCommand(command) {
  try {
    const output = execSync(command, {
      cwd: CWD,
      encoding: "utf-8",
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return output || "(no output)";
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

function writeFile(filePath, content, mode = "write") {
  try {
    const path = require("path");
    const fs = require("fs");
    const fullPath = path.resolve(CWD, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (mode === "append") {
      fs.appendFileSync(fullPath, content, "utf-8");
    } else {
      fs.writeFileSync(fullPath, content, "utf-8");
    }
    return `OK: ${fullPath} (${content.length} chars)`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

function trimMessages() {
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "tool" && messages[i].content.length > 500) {
      messages[i].content =
        messages[i].content.substring(0, 200) +
        "\n...(trimmed)...\n" +
        messages[i].content.substring(messages[i].content.length - 200);
    }
  }
}

function apiCall() {
  trimMessages();
  const body = JSON.stringify({ model: "deepseek-chat", messages, tools, max_tokens: 8192 });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.deepseek.com",
        path: "/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error("Invalid API response"));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function chat(userMessage) {
  messages.push({ role: "user", content: userMessage });
  let step = 0;

  while (true) {
    const stop = spinner(step === 0 ? "Đang suy nghĩ..." : "Đang tiếp tục...");
    const res = await apiCall();
    stop();

    const choice = res.choices?.[0];
    if (!choice) {
      console.log("(no response)\n");
      return;
    }

    const msg = choice.message;
    messages.push(msg);

    if (msg.tool_calls) {
      for (const call of msg.tool_calls) {
        step++;
        const args = JSON.parse(call.function.arguments);
        let result;
        if (call.function.name === "write_file") {
          console.log(`  [${step}] 📝 ${args.path} (${args.mode || "write"})`);
          result = writeFile(args.path, args.content, args.mode);
        } else {
          console.log(`  [${step}] ⚡ ${args.command}`);
          result = runCommand(args.command);
        }
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }
    } else {
      console.log(msg.content || "");
      console.log();
      return;
    }
  }
}

function prompt() {
  rl.question("You: ", async (input) => {
    const trimmed = input.trim();
    if (!trimmed) return prompt();
    if (trimmed === "exit" || trimmed === "quit") {
      console.log("Bye!");
      rl.close();
      return;
    }

    console.log();
    const start = Date.now();
    try {
      await chat(trimmed);
    } catch (err) {
      console.error("❌ Lỗi:", err.message, "\n");
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`⏱️  ${elapsed}s\n`);
    prompt();
  });
}

console.log(`DeepSeek Chat (CWD: ${CWD})`);
console.log("Type 'exit' to quit\n");
prompt();
