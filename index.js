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
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read content of a file with line numbers. Use start_line/end_line to read a specific range for large files.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to CWD" },
          start_line: { type: "number", description: "Start line number (1-based, optional)" },
          end_line: { type: "number", description: "End line number (inclusive, optional)" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Edit a file by finding and replacing an exact string. The old_string must be unique in the file. Use read_file first to see current content.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path relative to CWD" },
          old_string: { type: "string", description: "Exact string to find (must be unique in the file)" },
          new_string: { type: "string", description: "Replacement string" },
        },
        required: ["path", "old_string", "new_string"],
      },
    },
  },
];

const messages = [
  {
    role: "system",
    content: `Bạn là senior frontend developer & UI/UX designer chuyên thiết kế giao diện web chuyên nghiệp, sáng tạo, responsive bằng HTML + Tailwind CSS + vanilla JavaScript.

═══ CÔNG NGHỆ ═══
• HTML5 semantic + Tailwind CSS (CDN mới nhất) + vanilla JavaScript
• Font: DUY NHẤT 1 Google Font hỗ trợ tiếng Việt (mặc định: Be Vietnam Pro)
  Thay thế: Manrope | Inter | Roboto | Montserrat | Open Sans
• Icon: Google Material Symbols Outlined (CDN) — KHÔNG dùng bộ icon khác
• Không dùng CSS tùy chỉnh trừ animation keyframes khi cần

═══ NGUYÊN TẮC THIẾT KẾ ═══
• Mobile-first responsive: sm → md → lg → xl → 2xl
• Semantic HTML5 (header, nav, main, section, footer) + aria labels
• Thứ tự class: layout → position → spacing → size → typo → color → bg/border → rounded/shadow → effects → states → responsive
• Color palette: Chọn 1 primary color + 1 accent, tạo gradient tinh tế khi phù hợp
• Typography hierarchy rõ ràng: heading → subheading → body → caption
• Whitespace & spacing nhất quán (dùng Tailwind spacing scale)
• Dark mode toggle khi phù hợp (class strategy)

═══ JAVASCRIPT & INTERACTIONS ═══
• Mobile hamburger menu (toggle open/close)
• Smooth scroll cho anchor links
• Scroll animations: IntersectionObserver → fade-in/slide-up khi sections vào viewport
• Hover effects: scale, shadow lift, color transition trên cards & buttons
• Sticky/fixed header khi scroll (thêm shadow)
• Back-to-top button (hiện khi scroll xuống)
• Counter animation cho số liệu thống kê (nếu có)
• Đặt TẤT CẢ JavaScript ở cuối file trước </body>, trong 1 block <script>

═══ PHONG CÁCH THIẾT KẾ ═══
Chọn 1 phong cách (hoặc user chỉ định):
• minimal-clean: Trắng chủ đạo, typography mạnh, nhiều whitespace, accent color tinh tế
• modern-saas: Gradient backgrounds, floating cards, badge/pill elements, CTA nổi bật
• corporate-pro: Navy/dark blue tones, grid chặt chẽ, trust badges, professional imagery placeholders
• bento-grid: Layout dạng grid không đều (Bento box), cards kích thước khác nhau, visual hierarchy
• dark-premium: Nền tối (#0a0a0a), text sáng, accent neon/gold, glassmorphism cards
• glassmorphism: Backdrop-blur, bg-white/10, border trắng mờ, gradient backgrounds rực rỡ
• brutalist-raw: Font mono/bold, border đậm, màu nguyên bản, layout phá cách
• japanese-minimal: Thiên nhiên tones, zen spacing, đường kẻ mảnh, serif headings

═══ QUY TRÌNH LÀM VIỆC ═══
1. PHÂN TÍCH: Đọc yêu cầu → chọn phong cách → lên cấu trúc sections
2. LÊN KẾ HOẠCH: Liệt kê các sections sẽ tạo + ước lượng số phần chia nhỏ
3. VIẾT CODE: Dùng write_file tạo file HTML hoàn chỉnh (standalone, mở browser chạy ngay)
4. XÁC NHẬN: Chạy "ls -la" xác nhận file → báo user mở browser

═══ GIỚI HẠN OUTPUT — BẮT BUỘC ═══
• Mỗi lần write_file: TỐI ĐA 100 dòng code
• File > 100 dòng → BẮT BUỘC chia nhỏ:
  - Phần 1: write_file mode="write" (≤100 dòng)
  - Phần 2+: write_file mode="append" (≤100 dòng mỗi phần)
• Khi bắt đầu mỗi phần, ghi comment <!-- PART X: Mô tả --> ở đầu
• KHÔNG cắt giữa tag HTML — mỗi phần phải kết thúc ở tag đóng hợp lệ
• NGHIÊM CẤM ghi >100 dòng/lần — vi phạm gây lỗi hệ thống

═══ CẤU TRÚC FILE HTML CHUẨN ═══
Phần 1 (mode="write"): <!DOCTYPE html> → <head> hoàn chỉnh → mở <body> → Navbar/Header
Phần 2+ (mode="append"): Mỗi phần = 1-2 sections nội dung
Phần cuối (mode="append"): Footer + block <script> JavaScript + đóng </body></html>

═══ TOOL USAGE ═══
• write_file: Tạo/ghi file (mode="write" tạo mới, mode="append" ghi tiếp)
• read_file: Xem file hiện tại trước khi sửa
• edit_file: Sửa nhỏ (find & replace, old_string phải unique)
• run_command: mkdir, ls -la, pwd (kiểm tra hệ thống)

═══ QUAN TRỌNG ═══
• LUÔN tạo file bằng write_file — KHÔNG hiển thị code trong chat
• Khi sửa: read_file → phân tích → edit_file (KHÔNG viết lại toàn bộ)
• Mỗi section cần dummy content thực tế (không lorem ipsum) — viết tiếng Việt tự nhiên
• Image placeholders: dùng https://placehold.co/WxH hoặc gradient/svg background
• Sau khi tạo xong: thông báo tên file + hướng dẫn mở browser
• Hỏi tiếp: "Bạn muốn chỉnh sửa phần nào?"

Bắt đầu ngay khi có yêu cầu rõ ràng.
`,
  },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const COMMANDS = {
  "/clear": {
    description: "Xóa lịch sử chat, bắt đầu cuộc trò chuyện mới",
    handler: () => {
      messages.splice(1);
      console.log("\n🗑️  Đã xóa lịch sử chat. Bắt đầu cuộc trò chuyện mới.\n");
    },
  },
  "/help": {
    description: "Hiển thị danh sách lệnh",
    handler: () => {
      console.log("\nCác lệnh có sẵn:");
      console.log("  exit, quit     - Thoát chương trình");
      Object.entries(COMMANDS).forEach(([cmd, { description }]) => {
        console.log(`  ${cmd.padEnd(15)} - ${description}`);
      });
      console.log();
    },
  },
  "/history": {
    description: "Hiển thị thống kê lịch sử chat",
    handler: () => {
      const userMsgs = messages.filter((m) => m.role === "user").length;
      const assistantMsgs = messages.filter((m) => m.role === "assistant").length;
      const toolMsgs = messages.filter((m) => m.role === "tool").length;
      const totalChars = messages.reduce((sum, m) => sum + (typeof m.content === "string" ? m.content.length : 0), 0);
      console.log(`\n📊 Lịch sử chat:`);
      console.log(`  Tin nhắn: ${messages.length} tổng (${userMsgs} user, ${assistantMsgs} assistant, ${toolMsgs} tool, 1 system)`);
      console.log(`  Ước tính ký tự: ${totalChars.toLocaleString()}`);
      console.log();
    },
  },
};

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

function readFile(filePath, startLine, endLine) {
  try {
    const path = require("path");
    const fs = require("fs");
    const fullPath = path.resolve(CWD, filePath);
    if (!fs.existsSync(fullPath)) return `Error: File not found: ${fullPath}`;
    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");
    const total = lines.length;
    const start = Math.max(1, startLine || 1);
    const end = Math.min(total, endLine || total);
    const numbered = lines
      .slice(start - 1, end)
      .map((line, i) => `${String(start + i).padStart(4)} | ${line}`)
      .join("\n");
    const rangeInfo = (startLine || endLine) ? ` (showing lines ${start}-${end})` : "";
    return `File: ${filePath} (${total} lines total)${rangeInfo}\n${numbered}`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

function editFile(filePath, oldString, newString) {
  try {
    const path = require("path");
    const fs = require("fs");
    const fullPath = path.resolve(CWD, filePath);
    if (!fs.existsSync(fullPath)) return `Error: File not found: ${fullPath}`;
    const content = fs.readFileSync(fullPath, "utf-8");
    const count = content.split(oldString).length - 1;
    if (count === 0) return `Error: old_string not found in ${filePath}. Use read_file to check current content.`;
    if (count > 1) return `Error: old_string found ${count} times in ${filePath}. Provide a more unique string with surrounding context.`;
    const newContent = content.replace(oldString, newString);
    fs.writeFileSync(fullPath, newContent, "utf-8");
    const lineNum = content.substring(0, content.indexOf(oldString)).split("\n").length;
    const totalLines = newContent.split("\n").length;
    return `OK: ${filePath} edited at line ${lineNum} (${totalLines} lines total)`;
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

function trimMessages() {
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === "tool" && messages[i].content.length > 3000) {
      messages[i].content =
        messages[i].content.substring(0, 1500) +
        "\n...(trimmed)...\n" +
        messages[i].content.substring(messages[i].content.length - 1500);
    }
  }
}

function extractPartialContent(argsString) {
  try {
    const pathMatch = argsString.match(/"path"\s*:\s*"([^"]+)"/);
    if (!pathMatch) return null;

    const contentStart = argsString.indexOf('"content"');
    if (contentStart === -1) return null;

    // Tìm vị trí bắt đầu giá trị content (sau "content":")
    const colonPos = argsString.indexOf(":", contentStart + 9);
    const quotePos = argsString.indexOf('"', colonPos + 1);
    if (quotePos === -1) return null;

    let rawContent = argsString.substring(quotePos + 1);

    // Cắt tại dòng hoàn chỉnh cuối cùng (\\n trong JSON string)
    const lastNewline = rawContent.lastIndexOf("\\n");
    if (lastNewline > 0) {
      rawContent = rawContent.substring(0, lastNewline);
    }

    // Parse JSON escaped string → plain text
    const parsed = JSON.parse('"' + rawContent + '"');
    if (!parsed || parsed.length < 10) return null;

    // Tìm mode nếu có
    const modeMatch = argsString.match(/"mode"\s*:\s*"([^"]+)"/);
    const mode = modeMatch ? modeMatch[1] : "write";

    return { path: pathMatch[1], content: parsed, mode };
  } catch {
    return null;
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

// --- Progress Display ---
const LOG = {
  header(filename) {
    console.log(`\n╭─ 🎨 Đang tạo: ${filename}`);
    console.log("│");
  },
  step(current, icon, action, detail, extra = "") {
    const num = `[${current}]`;
    const ex = extra ? ` ${extra}` : "";
    console.log(`├─ ${num} ${icon} ${action} ─ ${detail}${ex}`);
  },
  warn(text) {
    console.log(`├─ ⚠️  ${text}`);
  },
  retry(current, max) {
    console.log(`├─ 🔄 Tự động tiếp tục... (${current}/${max})`);
  },
  footer(filename, totalChars, elapsed) {
    console.log("│");
    if (filename && totalChars > 0) {
      console.log(`╰─ ✅ Hoàn tất: ${filename} (${totalChars.toLocaleString()} chars) ⏱️ ${elapsed}s\n`);
    } else {
      console.log(`╰─ ✅ Hoàn tất ⏱️ ${elapsed}s\n`);
    }
  },
  error(text) {
    console.log(`╰─ ❌ ${text}\n`);
  }
};

async function chat(userMessage) {
  messages.push({ role: "user", content: userMessage });
  let step = 0;
  let retryCount = 0;
  const MAX_RETRIES = 6;

  // --- Tracking tiến trình ---
  let currentFile = null;
  let totalChars = 0;
  let headerShown = false;

  // Helper: hiện header nếu chưa hiện
  function showHeader(filename) {
    if (!headerShown && filename) {
      currentFile = filename;
      LOG.header(filename);
      headerShown = true;
    }
  }

  // Helper: xử lý log + execute cho 1 tool call đã parse thành công
  function execTool(call, args) {
    let result;
    if (call.function.name === "write_file") {
      showHeader(args.path);
      const action = args.mode === "append" ? "Ghi tiếp" : "Tạo file";
      const charCount = args.content.length;
      LOG.step(step, "📝", action, args.path, `✓ ${charCount.toLocaleString()} chars`);
      result = writeFile(args.path, args.content, args.mode);
      totalChars += charCount;
    } else if (call.function.name === "read_file") {
      const range = args.start_line ? ` (L${args.start_line}-${args.end_line || "end"})` : "";
      LOG.step(step, "📖", "Đọc file", args.path + range);
      result = readFile(args.path, args.start_line, args.end_line);
    } else if (call.function.name === "edit_file") {
      LOG.step(step, "✏️", "Sửa file", args.path);
      result = editFile(args.path, args.old_string, args.new_string);
    } else {
      LOG.step(step, "⚡", "Lệnh", args.command || "(unknown)");
      result = runCommand(args.command);
    }
    return result;
  }

  while (true) {
    const stop = spinner(step === 0 ? "Đang suy nghĩ..." : "Đang tiếp tục...");
    let res;
    try {
      res = await apiCall();
    } catch (apiErr) {
      stop();
      throw apiErr;
    }
    stop();

    const choice = res.choices?.[0];
    if (!choice) {
      console.log("(no response)\n");
      return { file: currentFile, chars: totalChars };
    }

    // ═══ TRƯỜNG HỢP 1: Response bị cắt do token limit ═══
    if (choice.finish_reason === "length") {
      const msg = choice.message;
      let handled = false;

      if (msg && msg.tool_calls && msg.tool_calls.length > 0) {
        const completedCalls = [];
        const toolResults = [];

        for (const call of msg.tool_calls) {
          let args;
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            args = null;
          }

          if (args) {
            // Tool call hoàn chỉnh → execute bình thường
            step++;
            const result = execTool(call, args);
            completedCalls.push(call);
            toolResults.push({ role: "tool", tool_call_id: call.id, content: result });
            handled = true;
          } else if (!args && call.function.name === "write_file") {
            // Arguments bị cắt → extract partial content
            const partial = extractPartialContent(call.function.arguments);
            if (partial) {
              step++;
              showHeader(partial.path);
              LOG.warn(`Response bị cắt, đang lưu phần đã nhận (${partial.content.length.toLocaleString()} chars)...`);
              writeFile(partial.path, partial.content, partial.mode);
              totalChars += partial.content.length;
              const fixedCall = {
                id: call.id, type: call.type,
                function: { name: "write_file", arguments: JSON.stringify({ path: partial.path, content: "(partial - đã ghi)", mode: partial.mode }) }
              };
              completedCalls.push(fixedCall);
              toolResults.push({ role: "tool", tool_call_id: call.id, content: `PARTIAL: Đã ghi ${partial.content.length} chars vào ${partial.path} (mode=${partial.mode}). File chưa hoàn chỉnh, cần tiếp tục phần còn lại.` });
              handled = true;
            }
          }

          if (!handled) { handled = true; }
        }

        if (completedCalls.length > 0) {
          messages.push({ role: "assistant", content: msg.content || "", tool_calls: completedCalls });
          for (const tr of toolResults) { messages.push(tr); }
        } else {
          messages.push({ role: "assistant", content: msg.content || "(response bị cắt)" });
        }
      } else if (msg && msg.content) {
        messages.push(msg);
        handled = true;
      }

      if (!handled) {
        messages.push({ role: "assistant", content: "(response bị cắt)" });
      }

      retryCount++;
      if (retryCount >= MAX_RETRIES) {
        LOG.error("Đã vượt quá số lần retry tự động. File có thể chưa hoàn chỉnh.");
        return { file: currentFile, chars: totalChars };
      }

      LOG.retry(retryCount, MAX_RETRIES);
      messages.push({
        role: "user",
        content: "SYSTEM: Response trước bị cắt do giới hạn token. Hãy TIẾP TỤC CHÍNH XÁC từ chỗ dừng. Dùng write_file mode='append' để ghi tiếp phần còn lại. Nhớ giới hạn ≤100 dòng mỗi lần gọi write_file. KHÔNG viết lại từ đầu."
      });
      continue;
    }

    // ═══ TRƯỜNG HỢP 2: Normal flow ═══
    const msg = choice.message;
    messages.push(msg);

    if (msg.tool_calls) {
      let needsContinuation = false;

      for (const call of msg.tool_calls) {
        step++;

        let args;
        try {
          args = JSON.parse(call.function.arguments);
        } catch (parseErr) {
          if (call.function.name === "write_file") {
            const partial = extractPartialContent(call.function.arguments);
            if (partial) {
              showHeader(partial.path);
              LOG.warn(`Arguments bị cắt, đang lưu phần đã nhận (${partial.content.length.toLocaleString()} chars)...`);
              writeFile(partial.path, partial.content, partial.mode);
              totalChars += partial.content.length;
              messages.push({ role: "tool", tool_call_id: call.id, content: `PARTIAL: Đã ghi ${partial.content.length} chars vào ${partial.path}. Cần tiếp tục phần còn lại bằng mode="append".` });
              needsContinuation = true;
              continue;
            }
          }
          LOG.step(step, "❌", "Lỗi parse", parseErr.message);
          messages.push({ role: "tool", tool_call_id: call.id, content: `Error: Không thể parse arguments - ${parseErr.message}` });
          continue;
        }

        const result = execTool(call, args);
        messages.push({ role: "tool", tool_call_id: call.id, content: result });
      }

      if (needsContinuation) {
        retryCount++;
        if (retryCount >= MAX_RETRIES) {
          LOG.error("Đã vượt quá số lần retry tự động.");
          return { file: currentFile, chars: totalChars };
        }
        LOG.retry(retryCount, MAX_RETRIES);
        messages.push({
          role: "user",
          content: "SYSTEM: Phần trước bị cắt giữa chừng. Hãy TIẾP TỤC ghi phần còn lại bằng write_file mode='append'. Giới hạn ≤100 dòng mỗi lần. KHÔNG viết lại từ đầu."
        });
      }
    } else {
      // Kết thúc: in message text từ AI
      if (headerShown) {
        console.log("│");
        console.log(`├─ 💬 ${(msg.content || "").split("\n")[0]}`);
      } else {
        console.log(msg.content || "");
        console.log();
      }
      return { file: currentFile, chars: totalChars };
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

    const cmdKey = trimmed.toLowerCase();
    if (COMMANDS[cmdKey]) {
      COMMANDS[cmdKey].handler();
      return prompt();
    }

    if (trimmed.startsWith("/")) {
      console.log(`\nLệnh không hợp lệ: ${trimmed}`);
      console.log("Gõ /help để xem danh sách lệnh.\n");
      return prompt();
    }

    console.log();
    const start = Date.now();
    let result = null;
    try {
      result = await chat(trimmed);
    } catch (err) {
      console.error("❌ Lỗi:", err.message, "\n");
    }
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (result && result.file) {
      LOG.footer(result.file, result.chars, elapsed);
    } else {
      console.log(`⏱️  ${elapsed}s\n`);
    }
    prompt();
  });
}

console.log(`DeepSeek Chat (CWD: ${CWD})`);
console.log("Type /help for commands, 'exit' to quit\n");
prompt();
