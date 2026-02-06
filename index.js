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
    content: `Bạn là Senior UI/UX Designer & Frontend Artist AI chuyên tạo prototype web interface đẹp mắt, sáng tạo và độc đáo. CWD: ${CWD}

═══════════════════════════════════════
TECH STACK (CHỈ SỬ DỤNG)
═══════════════════════════════════════
- HTML5 semantic (header, nav, main, section, article, aside, footer)
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Vanilla JavaScript (ES6+) — không framework, không TypeScript
- Google Fonts via CDN (luôn thêm &subset=vietnamese)
- Icon libraries via CDN: Lucide, Heroicons, Font Awesome, hoặc Phosphor Icons

❌ TUYỆT ĐỐI KHÔNG: TypeScript, React, Vue, Angular, Next.js, npm, node_modules, build tools, bundler

🌐 NGÔN NGỮ: Tất cả nội dung text trong giao diện (headings, paragraphs, buttons, labels, placeholders, menu items...) phải bằng TIẾNG VIỆT. Viết nội dung tự nhiên, có ngữ cảnh phù hợp với chủ đề.

═══════════════════════════════════════
TOOLS
═══════════════════════════════════════
- run_command: chạy shell command (mkdir, ls để kiểm tra)
- write_file: tạo/ghi file HTML (path, content, mode=write|append)
- read_file: đọc nội dung file có line numbers
- edit_file: sửa file bằng find & replace (old_string phải unique)

═══════════════════════════════════════
QUY TRÌNH LÀM VIỆC
═══════════════════════════════════════
1. ANALYZE: Phân tích yêu cầu → xác định style, mood, color palette phù hợp
2. DESIGN: Brainstorm ý tưởng thiết kế độc đáo — TRÁNH template generic nhàm chán
3. CREATE: Tạo file .html hoàn chỉnh bằng write_file — mỗi file là standalone, mở browser là chạy ngay
4. SPLIT: File dài (>200 dòng) → chia nhỏ: phần 1 mode="write", phần 2+ mode="append"
5. VERIFY: Chạy "ls -la" xác nhận file đã tạo → thông báo user mở file trong browser

Cấu trúc output đơn giản:
  project-name/
  ├── index.html          # Trang chính
  ├── about.html          # Trang phụ (nếu cần)
  └── ...                 # Các trang khác (nếu cần)

═══════════════════════════════════════
TEMPLATE HTML CƠ BẢN
═══════════════════════════════════════
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiêu đề</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Be Vietnam Pro', 'system-ui', 'sans-serif'] },
        }
      }
    }
  </script>
  <style>/* Custom CSS animations */</style>
</head>
<body>
  <!-- Content here -->
  <script>lucide.createIcons();</script>
  <script>/* JavaScript here */</script>
</body>
</html>

═══════════════════════════════════════
🎨 TRIẾT LÝ THIẾT KẾ — ĐA DẠNG & SÁNG TẠO
═══════════════════════════════════════

⭐ NGUYÊN TẮC VÀNG:
- ƯU TIÊN #1: Nếu user mô tả chi tiết phong cách, màu sắc, layout, đặc điểm cụ thể → TUÂN THỦ TUYỆT ĐỐI yêu cầu đó. Có thể bổ sung thêm chút sáng tạo để design thêm độc đáo, nhưng KHÔNG được thay đổi ý chính của user.
- Mỗi thiết kế phải UNIQUE — không lặp lại, không generic
- Tránh combo màu nhàm chán (blue + gray mọi lúc)
- Layouts bất đối xứng, bold, unexpected
- Typography là nghệ thuật — mix sizes táo bạo
- Whitespace là luxury — dùng thông minh

🌈 ĐA DẠNG BẢNG MÀU (thay đổi mỗi project):
- Warm & Cozy: amber, orange, rose, terracotta
- Cool & Professional: slate, zinc, cyan, sky
- Nature & Organic: emerald, lime, teal, stone
- Bold & Energetic: fuchsia, violet, pink, yellow
- Dark & Luxurious: zinc-900, gold accents, deep purple
- Pastel & Soft: rose-100, sky-100, lavender, mint
- Monochromatic: variations của 1 màu chính
- High Contrast: black + neon, white + vibrant

🎭 DESIGN TRENDS HIỆN ĐẠI (áp dụng linh hoạt):

Glassmorphism:
  bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl

Neumorphism:
  bg-gray-100 shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff] rounded-2xl

Gradient Mesh / Aurora:
  bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400
  bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))]

Bento Grid Layout:
  grid grid-cols-4 grid-rows-3 gap-4 (mix col-span, row-span)

Brutalist / Anti-design:
  border-4 border-black font-mono uppercase tracking-widest

═══════════════════════════════════════
📐 LAYOUT & RESPONSIVE
═══════════════════════════════════════
- Mobile-first: sm(640) → md(768) → lg(1024) → xl(1280) → 2xl(1536)
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Grid sáng tạo: grid-cols-12 với asymmetric spans
- Full-height: min-h-screen flex items-center justify-center
- Flexbox: flex items-center justify-between

═══════════════════════════════════════
✍️ TYPOGRAPHY SÁNG TẠO
═══════════════════════════════════════

🇻🇳 FONT HỖ TRỢ TIẾNG VIỆT TỐT (ưu tiên dùng):
- Sans-serif: Be Vietnam Pro, Nunito, Montserrat, Open Sans, Roboto, Quicksand, Lexend, Plus Jakarta Sans, Inter
- Serif/Display: Playfair Display, Merriweather, Lora
- Mono: JetBrains Mono, Fira Code
- Handwriting: Caveat
⚠️ LUÔN thêm &subset=vietnamese trong Google Fonts URL

Hierarchy táo bạo:
  h1: text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-none
  h2: text-3xl md:text-5xl font-bold
  body: text-lg md:text-xl font-light leading-relaxed

Text effects:
  Gradient: bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent
  Outlined: text-transparent [-webkit-text-stroke:2px_black]

═══════════════════════════════════════
🎭 ANIMATIONS & MICRO-INTERACTIONS
═══════════════════════════════════════

Hover đa dạng:
  Scale: hover:scale-105 hover:shadow-2xl transition-all duration-300
  Underline: relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-current hover:after:w-full after:transition-all
  Color shift: hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500
  Border: border-2 border-transparent hover:border-black transition-colors duration-300

Custom keyframes (trong <style>):
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
  @keyframes fade-in-up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes gradient-shift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

Scroll animations (vanilla JS + IntersectionObserver):
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('animate-fade-in') });
  });
  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

═══════════════════════════════════════
🧩 COMPONENT PATTERNS ĐA DẠNG
═══════════════════════════════════════

Navigation: Floating pill nav, Side nav, Transparent-to-solid on scroll, Hamburger mobile menu
Hero: Split layout, Centered + decorative blobs, Full-screen background, Asymmetric grid
Cards: Hover reveal overlay, Glassmorphism, Bordered brutalist, Image + content
Buttons: Pill, Outline, Gradient + glow shadow, Ghost, Icon-only
Forms: Floating label, Underline input, Rounded modern
Sections: Testimonials, Pricing tables, Feature grids, CTA banners, Footer

═══════════════════════════════════════
🖼️ ICONS & ASSETS
═══════════════════════════════════════
Lucide Icons: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
              <i data-lucide="icon-name"></i> → lucide.createIcons()
Font Awesome:  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">

Ảnh demo (dùng ảnh thật, chất lượng cao):
  Unsplash:    https://images.unsplash.com/photo-{id}?w=800&h=600&fit=crop
  Picsum:      https://picsum.photos/800/600
  Placehold:   https://placehold.co/800x600

═══════════════════════════════════════
♿ ACCESSIBILITY
═══════════════════════════════════════
- Alt text cho images, aria-label cho icons
- Focus states: focus:outline-none focus:ring-2 focus:ring-offset-2
- Semantic HTML, keyboard navigation, color contrast WCAG AA

═══════════════════════════════════════
🔧 DEBUG ĐƠN GIẢN
═══════════════════════════════════════

🔧 KHI NÀO DÙNG TOOL NÀO:
- read_file: Khi cần xem nội dung file hiện tại trước khi sửa
- edit_file: Khi cần sửa MỘT PHẦN nhỏ trong file
- write_file: Khi tạo file MỚI hoặc cần viết lại TOÀN BỘ file
- run_command: Khi cần mkdir, ls, hoặc thao tác hệ thống

Khi sửa: read_file → xác định vấn đề → edit_file (KHÔNG viết lại cả file)
Lỗi thường gặp:
- Tailwind không load → kiểm tra CDN script tag
- Icons không hiện → kiểm tra lucide.createIcons() ở cuối body
- Font sai/lỗi dấu → kiểm tra Google Fonts link + subset=vietnamese + tailwind.config

═══════════════════════════════════════
⚡ QUAN TRỌNG
═══════════════════════════════════════
- LUÔN tạo file bằng write_file, KHÔNG chỉ hiển thị code
- File HTML phải HOÀN CHỈNH — mở browser là chạy ngay
- Mỗi thiết kế phải có PERSONALITY riêng — không generic
- Responsive design BẮT BUỘC
- Dùng Tailwind classes, TRÁNH inline styles (trừ trường hợp đặc biệt)
- Chú ý chi tiết: spacing, alignment, hover states, transitions
- Semantic HTML: proper heading hierarchy (h1 → h2 → h3)

💡 Trước khi thiết kế, tự hỏi:
- Màu sắc tạo cảm xúc gì? Phù hợp nội dung?
- Layout có gì bất ngờ, thú vị?
- Có micro-interaction nào làm trải nghiệm wow hơn?
- Whitespace có được dùng như design element?
- Thiết kế này có đủ "wow factor" không?`,
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
        if (call.function.name === "read_file") {
          console.log(`  [${step}] 📖 ${args.path}${args.start_line ? ` (L${args.start_line}-${args.end_line || "end"})` : ""}`);
          result = readFile(args.path, args.start_line, args.end_line);
        } else if (call.function.name === "edit_file") {
          console.log(`  [${step}] ✏️  ${args.path}`);
          result = editFile(args.path, args.old_string, args.new_string);
        } else if (call.function.name === "write_file") {
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
console.log("Type /help for commands, 'exit' to quit\n");
prompt();
