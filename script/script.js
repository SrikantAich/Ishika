// === Dropdown and Language Logic ===
const dropdowns = document.querySelectorAll(".dropdown-container"),
  inputLanguageDropdown = document.querySelector("#input-language"),
  outputLanguageDropdown = document.querySelector("#output-language"),
  inputTextElem = document.querySelector("#input-text"),
  outputTextElem = document.querySelector("#output-text"),
  swapBtn = document.querySelector(".swap-position"),
  errorMessageElem = document.getElementById("error-message"),
  loadingIndicator = document.getElementById("loading-indicator"),
  loadingText = document.getElementById("loading-text"),
  charsElem = document.getElementById("input-chars");

// Populate dropdowns
function populateDropdown(dropdown, options) {
  dropdown.querySelector("ul").innerHTML = "";
  options.forEach((option) => {
    const li = document.createElement("li");
    li.innerHTML = `${option.name} (${option.native})`;
    li.dataset.value = option.code;
    li.classList.add("option");
    dropdown.querySelector("ul").appendChild(li);
  });
}
populateDropdown(inputLanguageDropdown, languages);
populateDropdown(outputLanguageDropdown, languages);

// Helper to update dropdown UI selection
function selectDropdownOption(dropdown, code) {
  const options = dropdown.querySelectorAll(".option");
  options.forEach((opt) => {
    opt.classList.toggle("active", opt.dataset.value === code);
  });
  const selected = dropdown.querySelector(".selected");
  const selectedOption = dropdown.querySelector(`.option[data-value="${code}"]`);
  if (selectedOption) {
    selected.innerHTML = selectedOption.innerHTML;
    selected.dataset.value = code;
  }
}

// Braille detection function
function isBraille(text) {
  if (!text) return false;
  const brailleCharsCount = [...text].filter(
    (ch) => ch >= "\u2800" && ch <= "\u28FF"
  ).length;
  const ratio = brailleCharsCount / text.length;
  return ratio > 0.7;
}

// Dropdown event listeners
dropdowns.forEach((dropdown) => {
  dropdown.addEventListener("click", () => {
    dropdown.classList.toggle("active");
  });

  dropdown.querySelector("ul").addEventListener("click", (e) => {
    const item = e.target.closest(".option");
    if (!item) return;

    dropdown.querySelectorAll(".option").forEach((opt) => {
      opt.classList.remove("active");
    });
    item.classList.add("active");

    const selected = dropdown.querySelector(".selected");
    selected.innerHTML = item.innerHTML;
    selected.dataset.value = item.dataset.value;

    // If Braille is selected, set the other dropdown to English
    if (item.dataset.value === "braille") {
      let otherDropdown = dropdown === inputLanguageDropdown ? outputLanguageDropdown : inputLanguageDropdown;
      selectDropdownOption(otherDropdown, "en");
    }

    translate();
    dropdown.classList.remove("active");
  });
});

// Close dropdowns on outside click
document.addEventListener("click", (e) => {
  dropdowns.forEach((dropdown) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });
});

// Swap languages and text
swapBtn.addEventListener("click", () => {
  const inputLang = inputLanguageDropdown.querySelector(".selected");
  const outputLang = outputLanguageDropdown.querySelector(".selected");

  // Swap UI
  const tempHtml = inputLang.innerHTML;
  inputLang.innerHTML = outputLang.innerHTML;
  outputLang.innerHTML = tempHtml;

  const tempValue = inputLang.dataset.value;
  inputLang.dataset.value = outputLang.dataset.value;
  outputLang.dataset.value = tempValue;

  // Swap text
  const tempInputText = inputTextElem.value;
  inputTextElem.value = outputTextElem.value;
  outputTextElem.value = tempInputText;

  translate();
});

// === Braille Logic ===
const englishToBrailleMap = {
  a: "\u2801", b: "\u2803", c: "\u2809", d: "\u2819", e: "\u2811",
  f: "\u280B", g: "\u281B", h: "\u2813", i: "\u280A", j: "\u281A",
  k: "\u2805", l: "\u2807", m: "\u280D", n: "\u281D", o: "\u2815",
  p: "\u280F", q: "\u281F", r: "\u2817", s: "\u280E", t: "\u281E",
  u: "\u2825", v: "\u2827", w: "\u283A", x: "\u282D", y: "\u283D",
  z: "\u2835", " ": " ", ",": "\u2802", ";": "\u2806", ":": "\u2812",
  ".": "\u2832", "!": "\u2816", "?": "\u2826", "-": "\u2824", "'": "\u2804",
  '"': "\u2814", "\n": "\n",
};
const brailleToEnglishMap = {};
for (const [key, value] of Object.entries(englishToBrailleMap)) {
  brailleToEnglishMap[value] = key;
}
function englishToBraille(text) {
  text = text.toLowerCase();
  let result = "";
  for (let char of text) {
    result += englishToBrailleMap[char] || char;
  }
  return result;
}
function brailleToEnglish(text) {
  let result = "";
  for (let char of text) {
    result += brailleToEnglishMap[char] || char;
  }
  return result;
}

// === Speak output text (AUTOMATIC) ===
function speakOutputText() {
  const text = outputTextElem.value;
  if (!text) return;
  // Get the output language code
  const lang = outputLanguageDropdown.querySelector(".selected").dataset.value || "en";
  const utterance = new SpeechSynthesisUtterance(text);
  // Set the utterance language
  utterance.lang = lang;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}


// === Translation Logic ===
async function translate() {
  errorMessageElem && (errorMessageElem.style.display = "none");
  const inputText = inputTextElem.value;
  let inputLang = inputLanguageDropdown.querySelector(".selected").dataset.value;
  const outputLang = outputLanguageDropdown.querySelector(".selected").dataset.value;

  // Auto-detect Braille input
  if (inputLang !== "braille" && isBraille(inputText)) {
    inputLang = "braille";
    selectDropdownOption(inputLanguageDropdown, "braille");
    selectDropdownOption(outputLanguageDropdown, "en");
  }

  // Local Braille/English translation
  if (inputLang === "braille" && outputLang === "en") {
    outputTextElem.value = brailleToEnglish(inputText);
    speakOutputText();
    return;
  }
  if (inputLang === "en" && outputLang === "braille") {
    outputTextElem.value = englishToBraille(inputText);
    speakOutputText();
    return;
  }
  if (inputLang === "braille" && outputLang === "braille") {
    outputTextElem.value = inputText;
    speakOutputText();
    return;
  }

  // Google Translate API
  if (!inputText.trim()) {
    outputTextElem.value = "";
    return;
  }
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${inputLang}&tl=${outputLang}&dt=t&q=${encodeURIComponent(inputText)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Translation failed.");
    const json = await response.json();
    outputTextElem.value = json[0].map((item) => item[0]).join("");
    speakOutputText();
  } catch (error) {
    errorMessageElem.textContent = "Translation failed. Please try again.";
    errorMessageElem.style.display = "block";
  }
}

// Input events
inputTextElem.addEventListener("input", () => {
  if (inputTextElem.value.length > 5000) {
    inputTextElem.value = inputTextElem.value.slice(0, 5000);
  }
  charsElem && (charsElem.textContent = inputTextElem.value.length);
  translate();
});

// === File Upload Logic ===
const uploadInput = document.getElementById("upload-document");
const uploadTitle = document.getElementById("upload-title");
uploadInput && uploadInput.addEventListener("change", async function () {
  const file = this.files[0];
  if (!file) return;
  loadingIndicator && (loadingIndicator.style.display = "block");
  errorMessageElem && (errorMessageElem.style.display = "none");
  try {
    let text = "";
    if (file.type === "application/pdf") {
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(" ") + "\n";
      }
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      text = result.value;
    } else if (file.type.startsWith("text/") || file.name.endsWith(".txt")) {
      text = await file.text();
    } else {
      throw new Error("Unsupported file type.");
    }
    inputTextElem.value = text.slice(0, 5000);
    charsElem && (charsElem.textContent = inputTextElem.value.length);
    translate();
    uploadTitle && (uploadTitle.textContent = file.name);
  } catch (err) {
    errorMessageElem.textContent = "Could not read file: " + err.message;
    errorMessageElem.style.display = "block";
  } finally {
    loadingIndicator && (loadingIndicator.style.display = "none");
  }
});

// === Microphone Input (Speech Recognition) ===
const micInput = document.getElementById("mic-input");
const micTitle = document.getElementById("mic-title");
let recognition, recognizing = false;
if (micInput && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    recognizing = true;
    micTitle && (micTitle.textContent = "Listening...");
  };
  recognition.onresult = (event) => {
    recognizing = false;
    micTitle && (micTitle.textContent = "Speak");
    const transcript = event.results[0][0].transcript;
    inputTextElem.value = transcript.slice(0, 5000);
    charsElem && (charsElem.textContent = inputTextElem.value.length);
    translate();
  };
  recognition.onerror = (event) => {
    recognizing = false;
    micTitle && (micTitle.textContent = "Speak");
    errorMessageElem.textContent = "Speech recognition error: " + event.error;
    errorMessageElem.style.display = "block";
  };
  recognition.onend = () => {
    recognizing = false;
    micTitle && (micTitle.textContent = "Speak");
  };

  micInput.parentElement.addEventListener("click", () => {
    if (recognizing) {
      recognition.stop();
      micTitle && (micTitle.textContent = "Speak");
    } else {
      recognition.lang = inputLanguageDropdown.querySelector(".selected").dataset.value || "en-US";
      recognition.start();
    }
  });
} else if (micTitle) {
  micTitle.textContent = "Not supported";
  micInput && (micInput.parentElement.style.pointerEvents = "none");
}

// === Output Actions (Download, Copy, Speak) ===
document.getElementById("download-btn")?.addEventListener("click", () => {
  const blob = new Blob([outputTextElem.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "translation.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

document.getElementById("copyBtn")?.addEventListener("click", () => {
  navigator.clipboard.writeText(outputTextElem.value);
});

document.getElementById("speak-btn")?.addEventListener("click", () => {
  speakOutputText();
});

// === Speak on Hover Accessibility ===
function speakText(text) {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
function addSpeakOnHover() {
  const elements = document.querySelectorAll(
    'button, input[type="checkbox"], textarea, label, [role="button"], [aria-label]'
  );
  elements.forEach(elem => {
    elem.addEventListener('mouseenter', () => {
      const textToSpeak =
        elem.getAttribute('aria-label') ||
        elem.getAttribute('title') ||
        elem.innerText.trim();
      speakText(textToSpeak);
    });
    elem.addEventListener('mouseleave', () => {
      window.speechSynthesis.cancel();
    });
  });
}
const darkModeToggle = document.getElementById('dark-mode-btn');

if (darkModeToggle) {
  // On toggle change, add/remove dark-mode class on body
  darkModeToggle.addEventListener('change', function() {
    if (this.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('darkMode', 'disabled');
    }
  });

  // On page load, restore user's preference
  if (localStorage.getItem('darkMode') === 'enabled') {
    darkModeToggle.checked = true;
    document.body.classList.add('dark-mode');
  }
}

window.addEventListener('DOMContentLoaded', addSpeakOnHover);
