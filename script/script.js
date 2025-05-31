// --- Language dropdown logic ---
const dropdowns = document.querySelectorAll(".dropdown-container"),
  inputLanguageDropdown = document.querySelector("#input-language"),
  outputLanguageDropdown = document.querySelector("#output-language");

// Populate dropdown options
function populateDropdown(dropdown, options) {
  dropdown.querySelector("ul").innerHTML = "";
  options.forEach((option) => {
    const li = document.createElement("li");
    const title = option.name + " (" + option.native + ")";
    li.innerHTML = title;
    li.dataset.value = option.code;
    li.classList.add("option");
    dropdown.querySelector("ul").appendChild(li);
  });
}

// Populate language dropdowns with your languages array (make sure 'languages' is defined globally)
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

// Braille detection function - returns true if >70% of chars are Braille Unicode
function isBraille(text) {
  if (!text) return false;
  const brailleCharsCount = [...text].filter(
    (ch) => ch >= "\u2800" && ch <= "\u28FF"
  ).length;
  const ratio = brailleCharsCount / text.length;
  return ratio > 0.7;
}

// Add event listeners for toggling dropdown open/close and option selection
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

    // If Braille is selected in this dropdown, set the other dropdown to English
    if (item.dataset.value === "braille") {
      let otherDropdown = dropdown === inputLanguageDropdown ? outputLanguageDropdown : inputLanguageDropdown;
      selectDropdownOption(otherDropdown, "en");
    }

    translate();

    // Close dropdown after selection
    dropdown.classList.remove("active");
  });
});

// Close dropdowns if clicked outside
document.addEventListener("click", (e) => {
  dropdowns.forEach((dropdown) => {
    if (!dropdown.contains(e.target)) {
      dropdown.classList.remove("active");
    }
  });
});

const swapBtn = document.querySelector(".swap-position"),
  inputLanguage = inputLanguageDropdown.querySelector(".selected"),
  outputLanguage = outputLanguageDropdown.querySelector(".selected"),
  inputTextElem = document.querySelector("#input-text"),
  outputTextElem = document.querySelector("#output-text");

swapBtn.addEventListener("click", () => {
  // Swap language UI and values
  const tempHtml = inputLanguage.innerHTML;
  inputLanguage.innerHTML = outputLanguage.innerHTML;
  outputLanguage.innerHTML = tempHtml;

  const tempValue = inputLanguage.dataset.value;
  inputLanguage.dataset.value = outputLanguage.dataset.value;
  outputLanguage.dataset.value = tempValue;

  // Swap input/output text values
  const tempInputText = inputTextElem.value;
  inputTextElem.value = outputTextElem.value;
  outputTextElem.value = tempInputText;

  translate();
});

// Braille mappings
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

// Make translate async so we can await it in speech recognition result handler
async function translate() {
  const inputText = inputTextElem.value;
  let inputLang = inputLanguageDropdown.querySelector(".selected").dataset.value;
  const outputLang = outputLanguageDropdown.querySelector(".selected").dataset.value;

  // Auto-detect Braille input if needed
  if (inputLang !== "braille" && isBraille(inputText)) {
    inputLang = "braille";
    selectDropdownOption(inputLanguageDropdown, "braille");
    selectDropdownOption(outputLanguageDropdown, "en");
  }

  if (inputLang === "braille" && outputLang === "en") {
    outputTextElem.value = brailleToEnglish(inputText);
    return;
  }

  if (inputLang === "en" && outputLang === "braille") {
    outputTextElem.value = englishToBraille(inputText);
    return;
  }

  if (inputLang === "braille" && outputLang === "braille") {
    outputTextElem.value = inputText;
    return;
  }

  // For all other languages, use Google Translate API
  if (!inputText.trim()) {
    outputTextElem.value = "";
    return;
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${inputLang}&tl=${outputLang}&dt=t&q=${encodeURIComponent(
    inputText
  )}`;

  try {
    const response = await fetch(url);
    const json = await response.json();
    outputTextElem.value = json[0].map((item) => item[0]).join("");
  } catch (error) {
    console.error(error);
  }
}

inputTextElem.addEventListener("input", () => {
  if (inputTextElem.value.length > 5000) {
    inputTextElem.value = inputTextElem.value.slice(0, 5000);
  }
  translate();
});

// --- Accessibility: Speak on hover feature ---
function speakText(text) {
  if (!text) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.cancel(); // Cancel any ongoing speech
  window.speechSynthesis.speak(utterance);
}

// Add hover listeners to all relevant elements
function addSpeakOnHover() {
  // Select all interactive elements: buttons, checkboxes, textareas, labels, and anything with role="button" or aria-label
  const elements = document.querySelectorAll(
    'button, input[type="checkbox"], textarea, label, [role="button"], [aria-label]'
  );

  elements.forEach(elem => {
    elem.addEventListener('mouseenter', () => {
      // Prefer aria-label, then title, then innerText
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

// Run this after DOM is loaded and language dropdowns are populated
window.addEventListener('DOMContentLoaded', addSpeakOnHover);
