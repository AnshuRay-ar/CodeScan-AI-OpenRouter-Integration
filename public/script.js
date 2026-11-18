/* ============================================================
   CODESCAN AI — FRONTEND (CrowLLM / gpt-4.1-mini)
   The CrowLLM API key lives ONLY on the backend (.env).
   This file talks to /api/analyze on your own server.
============================================================ */

const AI_API_URL = "/api/analyze";

/* gpt-4.1-mini supports vision, so screenshots are sent to the model
   (OCR text is also included in the prompt). Requires ALLOW_IMAGES=true
   in the backend .env. If you get errors on image requests, set to false. */
const SEND_IMAGES_TO_API = true;


/* ============================================================
   DOM ELEMENTS
============================================================ */

const codeInput = document.getElementById("codeInput");
const lineNumbers = document.getElementById("lineNumbers");
const lineCount = document.getElementById("lineCount");
const langSelect = document.getElementById("langSelect");

const analyzeBtn = document.getElementById("analyzeBtn");
const analyzeLabel = document.getElementById("analyzeLabel");
const clearBtn = document.getElementById("clearBtn");
const sampleBtn = document.getElementById("sampleBtn");
const copyBtn = document.getElementById("copyBtn");
const retryBtn = document.getElementById("retryBtn");

const toast = document.getElementById("toast");

const reviewIdle = document.getElementById("reviewIdle");
const reviewLoading = document.getElementById("reviewLoading");
const reviewResult = document.getElementById("reviewResult");
const reviewError = document.getElementById("reviewError");

const loaderLabel = document.getElementById("loaderLabel");
const loaderBar = document.getElementById("loaderBar");

const resultMeta = document.getElementById("resultMeta");
const resultBody = document.getElementById("resultBody");
const errorMsg = document.getElementById("errorMsg");

/* Image attachment elements */
const panelEditor = document.getElementById("panelEditor");
const dropOverlay = document.getElementById("dropOverlay");
const attachStrip = document.getElementById("attachStrip");
const attachList = document.getElementById("attachList");
const attachCount = document.getElementById("attachCount");
const clearAttachBtn = document.getElementById("clearAttachBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");


/* ============================================================
   CONFIG — IMAGE ATTACHMENT LIMITS
============================================================ */

const MAX_IMAGES = 6;
const MAX_BYTES = 5 * 1024 * 1024;


/* ============================================================
   STATE
============================================================ */

let lastReview = "";
let lastCode = "";
let lastLang = "";
let lastImages = [];

let attachedImages = []; // { id, dataUrl, name, size, ocrText, ocrStatus }

let isAnalyzing = false;

let dragCounter = 0;


/* ============================================================
   SAMPLE CODE
============================================================ */

const SAMPLE_CODE = {

  javascript: `function calculateTotal(items) {
  var total = 0;
  for(let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}`,

  python: `def divide(a, b):
    return a / b

print(divide(10, 0))`

};


/* ============================================================
   LOADING MESSAGES
============================================================ */

const LOADING_MESSAGES = [
  "SCANNING CODE STRUCTURE...",
  "CHECKING SECURITY...",
  "ANALYZING PERFORMANCE...",
  "FINDING BUGS...",
  "GENERATING REVIEW..."
];


/* ============================================================
   HELPERS
============================================================ */

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function ocrPending() {
  return attachedImages.some(
    (i) => i.ocrStatus === "pending" || i.ocrStatus === "running"
  );
}


/* ============================================================
   UI STATE MANAGEMENT
============================================================ */

function showState(state) {

  reviewIdle.classList.add("hidden");
  reviewLoading.classList.add("hidden");
  reviewResult.classList.add("hidden");
  reviewError.classList.add("hidden");

  if (state === "idle")    reviewIdle.classList.remove("hidden");
  if (state === "loading") reviewLoading.classList.remove("hidden");
  if (state === "result")  reviewResult.classList.remove("hidden");
  if (state === "error")   reviewError.classList.remove("hidden");

}


/* ============================================================
   TOAST
============================================================ */

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}


/* ============================================================
   LINE NUMBERS
============================================================ */

function updateLineNumbers() {

  const lines = codeInput.value.split("\n");

  lineNumbers.textContent = lines.map((_, i) => i + 1).join("\n");

  lineCount.textContent =
    `${lines.length} lines · ${codeInput.value.length} chars`;

}

codeInput.addEventListener("input", updateLineNumbers);
codeInput.addEventListener("scroll", () => {
  lineNumbers.scrollTop = codeInput.scrollTop;
});


/* ============================================================
   TAB SUPPORT
============================================================ */

codeInput.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = codeInput.selectionStart;
    const end = codeInput.selectionEnd;

    codeInput.value =
      codeInput.value.substring(0, start) +
      "  " +
      codeInput.value.substring(end);

    codeInput.selectionStart = codeInput.selectionEnd = start + 2;
    updateLineNumbers();
  }
});


/* ============================================================
   IMAGE ATTACHMENT — CORE
============================================================ */

function addImage(file) {

  if (!file || !file.type || !file.type.startsWith("image/")) return;

  if (attachedImages.length >= MAX_IMAGES) {
    showToast(`Max ${MAX_IMAGES} images allowed`);
    return;
  }

  if (file.size > MAX_BYTES) {
    showToast(`Image too large (max ${formatBytes(MAX_BYTES)})`);
    return;
  }

  const reader = new FileReader();

  reader.onload = (e) => {

    const img = {
      id: Date.now() + "_" + Math.random().toString(36).slice(2, 8),
      dataUrl: e.target.result,
      name: file.name || "pasted-image",
      size: file.size,
      ocrText: "",
      ocrStatus: "pending"
    };

    attachedImages.push(img);
    renderAttachments();
    updateAnalyzeLabel();

    // Fire OCR asynchronously — do not block UI
    runOCR(img.id);
  };

  reader.onerror = () => showToast("Failed to read image");
  reader.readAsDataURL(file);
}


/* ============================================================
   OCR — READ TEXT FROM SCREENSHOT
============================================================ */

async function runOCR(id) {

  const img = attachedImages.find((i) => i.id === id);
  if (!img) return;

  img.ocrStatus = "running";
  renderAttachments();

  try {

    if (typeof Tesseract === "undefined") {
      throw new Error("Tesseract not loaded");
    }

    const { data } = await Tesseract.recognize(img.dataUrl, "eng");
    img.ocrText = (data.text || "").trim();
    img.ocrStatus = "done";

    if (!img.ocrText) {
      showToast(`No text found in "${img.name}"`);
    }

  } catch (err) {
    console.error("OCR failed:", err);
    img.ocrStatus = "error";
    img.ocrText = "";
  }

  renderAttachments();
  updateAnalyzeLabel();
}


/* ============================================================
   ATTACHMENT RENDER
============================================================ */

function renderAttachments() {

  if (attachedImages.length === 0) {
    attachStrip.classList.add("hidden");
    return;
  }

  attachStrip.classList.remove("hidden");
  attachCount.textContent = attachedImages.length;

  attachList.innerHTML = attachedImages.map((img) => {

    let cls = "attach-item";
    let badge = "";

    if (img.ocrStatus === "pending") {
      cls += " ocr-pending";
      badge = `<span class="ocr-badge running">OCR…</span>`;
    } else if (img.ocrStatus === "running") {
      cls += " ocr-running";
      badge = `<span class="ocr-badge running">OCR…</span>`;
    } else if (img.ocrStatus === "error") {
      cls += " ocr-error";
      badge = `<span class="ocr-badge error">FAIL</span>`;
    } else if (img.ocrStatus === "done") {
      const wc = img.ocrText ? img.ocrText.split(/\s+/).length : 0;
      badge = wc
        ? `<span class="ocr-badge done">${wc}w</span>`
        : `<span class="ocr-badge error">EMPTY</span>`;
    }

    return `
      <div class="${cls}" data-id="${img.id}" title="${escapeHtml(img.name)}">
        ${badge}
        <img src="${img.dataUrl}" alt="${escapeHtml(img.name)}" />
        <div class="attach-item-overlay">
          <span class="attach-item-size">${formatBytes(img.size)}</span>
          <button class="attach-remove" data-id="${img.id}" title="Remove">✕</button>
        </div>
      </div>
    `;
  }).join("");

  attachList.querySelectorAll(".attach-remove").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      attachedImages = attachedImages.filter((i) => i.id !== id);
      renderAttachments();
      updateAnalyzeLabel();
    });
  });
}


function clearAttachments() {
  attachedImages = [];
  renderAttachments();
  updateAnalyzeLabel();
}


function updateAnalyzeLabel() {
  const n = attachedImages.length;
  if (n === 0) {
    analyzeLabel.textContent = "ANALYZE CODE";
    return;
  }
  if (ocrPending()) {
    analyzeLabel.textContent = `OCR ${n} IMG…`;
  } else {
    analyzeLabel.textContent = `ANALYZE CODE + ${n} IMG`;
  }
}


function hasFilePayload(e) {
  if (!e.dataTransfer) return false;
  const types = e.dataTransfer.types;
  if (!types) return false;
  return Array.from(types).includes("Files");
}


/* ============================================================
   IMAGE ATTACHMENT — PASTE (Ctrl+V anywhere)
============================================================ */

document.addEventListener("paste", (e) => {

  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;

  const imageItems = [];
  for (const item of items) {
    if (item.type && item.type.startsWith("image/")) {
      imageItems.push(item);
    }
  }

  if (imageItems.length === 0) return;

  e.preventDefault();

  for (const item of imageItems) {
    const file = item.getAsFile();
    if (file) addImage(file);
  }
});


/* ============================================================
   IMAGE ATTACHMENT — DRAG & DROP
============================================================ */

panelEditor.addEventListener("dragenter", (e) => {
  if (!hasFilePayload(e)) return;
  e.preventDefault();
  dragCounter++;
  if (dragCounter === 1) dropOverlay.classList.add("active");
});

panelEditor.addEventListener("dragover", (e) => {
  if (!hasFilePayload(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

panelEditor.addEventListener("dragleave", () => {
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropOverlay.classList.remove("active");
  }
});

panelEditor.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropOverlay.classList.remove("active");

  const files = e.dataTransfer && e.dataTransfer.files;
  if (!files || files.length === 0) return;

  for (const file of files) addImage(file);
});


/* ============================================================
   IMAGE ATTACHMENT — FILE PICKER
============================================================ */

attachBtn.addEventListener("click", () => {
  if (isAnalyzing) return;
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const files = fileInput.files;
  if (files && files.length) {
    for (const file of files) addImage(file);
  }
  fileInput.value = "";
});

clearAttachBtn.addEventListener("click", () => {
  if (isAnalyzing) return;
  clearAttachments();
  showToast("Attachments cleared");
});


/* ============================================================
   PROMPT BUILDER
============================================================ */

function buildPrompt(code, language, images = []) {

  const hasOCR = images.some((i) => i.ocrText && i.ocrText.trim());
  const hasImages = images.length > 0;

  let intro = "";

  if (hasImages) {
    intro = `
IMPORTANT — SCREENSHOTS PROVIDED:

${images.length} screenshot(s) were attached.

${hasOCR
  ? `The OCR-extracted code from each screenshot is provided below between
<<<OCR START>>> and <<<OCR END>>> markers. Treat this OCR text as the
authoritative code to review. The OCR may contain minor character errors
(e.g. "0" vs "O", "1" vs "l") — correct such OCR artifacts when producing
the corrected code, and note them only if they caused a real bug.`
  : `No OCR text could be extracted from the screenshots.`
}

If the text code block below is empty, review the OCR text.
If both are present, review the OCR text and the text code together.
`;
  }

  const ocrSection = hasOCR
    ? `

<<<OCR START>>>
${images
  .filter((img) => img.ocrText && img.ocrText.trim())
  .map((img, idx) => `
### Screenshot ${idx + 1} — ${img.name}
${img.ocrText}
`).join("\n")}
<<<OCR END>>>
`
    : "";

  const codeBlock = code && code.trim().length
    ? code
    : `// (no text code provided — analyze the OCR text and/or screenshot(s))`;

  return `${intro}${ocrSection}

You are a Senior ${language} Developer.

Your task is to:

1. Find actual bugs in the provided code.
2. Fix the bugs.
3. Return the complete corrected code.
4. Explain ONLY the actual corrections made.
5. Show the exact original and corrected lines.
6. Do not add unrelated optimizations, refactoring,
   best practices or unnecessary suggestions.

STRICT RULES:

- Return ONLY the requested format.
- Do not create fake issues.
- Do not mention anything that was not changed.
- Do not add sections that have no corrections.
- Preserve original functionality unless fixing a bug.
- Corrected code must be complete and runnable.
- Reference original line numbers, counting the first line as line 1.
- Preserve the original coding style where possible.
- Do not invent line numbers.

Respond EXACTLY in this format:

# CORRECTED CODE

\`\`\`${language}
<full corrected code>
\`\`\`

# CORRECTIONS MADE

## Correction 1

**Line**
<original line number>

**Original Code**
\`\`\`${language}
<exact original line>
\`\`\`

**Corrected Code**
\`\`\`${language}
<exact corrected line>
\`\`\`

**What Was Wrong**
- Explain exactly what was wrong and why it caused an issue.

Repeat only for actual corrections.

If no corrections are required, return:

# CORRECTED CODE

\`\`\`${language}
<original code>
\`\`\`

# CORRECTIONS MADE

No corrections were required.

CODE:

\`\`\`${language}
${codeBlock}
\`\`\`
`;

}


/* ============================================================
   BACKEND CALL  (server.js -> CrowLLM gpt-4.1-mini)
============================================================ */

async function analyzeCode(code, language, images = []) {

  const prompt = buildPrompt(code, language, images);

  const payload = {
    code,
    language,
    prompt,
    imageCount: images.length
  };

  // Needs ALLOW_IMAGES=true on the backend.
  if (SEND_IMAGES_TO_API && images.length > 0) {
    payload.images = images.map((img) => img.dataUrl);
  }

  const response = await fetch(AI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {

    const message =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || `Request failed: ${response.status}`;

    if (response.status === 400)
      throw new Error(`Invalid request: ${message}`);
    if (response.status === 401 || response.status === 403)
      throw new Error("CrowLLM authentication failed. Check CROWLLM_API_KEY in the server .env.");
    if (response.status === 404)
      throw new Error("API route or model not found. Check the backend configuration.");
    if (response.status === 413)
      throw new Error(message || "Request is too large. Use less code or fewer images.");
    if (response.status === 429)
      throw new Error("Free model rate limit reached or provider is busy. Please wait and retry.");
    if ([502, 503, 504].includes(response.status))
      throw new Error("The AI provider is temporarily unavailable. Please retry shortly.");

    throw new Error(message);
  }

  if (typeof data.result === "string" && data.result.trim()) {
    return data.result;
  }

  throw new Error("Unexpected backend response. No generated content received.");
}


/* ============================================================
   RENDER REVIEW
============================================================ */

function renderReview(review, language) {

  const imageCount = lastImages.length;
  const hasOCR = lastImages.some((i) => i.ocrText && i.ocrText.trim());

  resultMeta.innerHTML = `

    <span class="meta-badge badge-blue">
      ${escapeHtml(language.toUpperCase())}
    </span>

    <span class="meta-badge badge-green">
      AI REVIEW COMPLETE
    </span>

    <span class="meta-badge">GPT-4.1 MINI</span>

    ${imageCount > 0
      ? `<span class="meta-badge badge-yellow">${imageCount} IMG</span>`
      : ""}

    ${hasOCR
      ? `<span class="meta-badge badge-green">OCR USED</span>`
      : ""}

  `;

  // Model output is untrusted: sanitize if DOMPurify is loaded.
  let formattedHTML = marked.parse(review);
  if (window.DOMPurify) {
    formattedHTML = DOMPurify.sanitize(formattedHTML);
  }

  resultBody.innerHTML = `
    <div class="review-section fade-in markdown-body">
      ${formattedHTML}
    </div>
  `;

  lastReview = review;
}


/* ============================================================
   MAIN ANALYZE FUNCTION
============================================================ */

async function analyze() {

  if (isAnalyzing) return;

  const code = codeInput.value.trim();
  const imageCount = attachedImages.length;

  if (!code && imageCount === 0) {
    showToast("Paste some code or an image first");
    return;
  }

  if (ocrPending()) {
    showToast("OCR still running — wait a moment");
    return;
  }

  // Images with no readable text and no typed code = nothing to review
  const hasOCRText = attachedImages.some((i) => i.ocrText && i.ocrText.trim());
  if (!code && !hasOCRText && !SEND_IMAGES_TO_API) {
    showToast("No text could be read from the image(s)");
    return;
  }

  lastCode = code;
  lastLang = langSelect.value;
  lastImages = attachedImages.slice();

  isAnalyzing = true;
  analyzeBtn.disabled = true;

  showState("loading");

  let loadingIndex = 0;
  loaderLabel.textContent = LOADING_MESSAGES[0];

  const loadingInterval = setInterval(() => {
    loadingIndex++;
    loaderLabel.textContent =
      LOADING_MESSAGES[loadingIndex % LOADING_MESSAGES.length];
  }, 2000);

  try {

    const review = await analyzeCode(code, lastLang, lastImages);

    renderReview(review, lastLang);
    showState("result");

  } catch (error) {

    console.error("CodeScan AI Error:", error);
    errorMsg.textContent = error.message || "Unable to analyze code.";
    showState("error");

  } finally {

    clearInterval(loadingInterval);
    isAnalyzing = false;
    analyzeBtn.disabled = false;

  }
}


/* ============================================================
   BUTTON EVENTS
============================================================ */

analyzeBtn.addEventListener("click", analyze);

clearBtn.addEventListener("click", () => {
  if (isAnalyzing) return;
  codeInput.value = "";
  attachedImages = [];
  renderAttachments();
  updateAnalyzeLabel();
  updateLineNumbers();
  showState("idle");
  showToast("Editor cleared");
});

sampleBtn.addEventListener("click", () => {
  if (isAnalyzing) return;
  const lang = langSelect.value;
  codeInput.value = SAMPLE_CODE[lang] || SAMPLE_CODE.javascript;
  updateLineNumbers();
  showToast("Sample loaded");
});

copyBtn.addEventListener("click", async () => {
  if (!lastReview) { showToast("No review to copy"); return; }
  try {
    await navigator.clipboard.writeText(lastReview);
    showToast("Review copied");
  } catch {
    showToast("Unable to copy review");
  }
});

retryBtn.addEventListener("click", () => {
  if (isAnalyzing) return;
  codeInput.value = lastCode;
  langSelect.value = lastLang;
  attachedImages = lastImages.slice();
  renderAttachments();
  updateAnalyzeLabel();
  updateLineNumbers();
  analyze();
});


/* ============================================================
   KEYBOARD SHORTCUT
============================================================ */

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    analyze();
  }
});


/* ============================================================
   INIT
============================================================ */

updateLineNumbers();
updateAnalyzeLabel();
showState("idle");