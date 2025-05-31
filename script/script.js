const dropdowns = document.querySelectorAll(".dropdown-container"),
  inputLanguageDropdown = document.querySelector("#input-language"),
  outputLanguageDropdown = document.querySelector("#output-language");

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
  a: "\u2801",
  b: "\u2803",
  c: "\u2809",
  d: "\u2819",
  e: "\u2811",
  f: "\u280B",
  g: "\u281B",
  h: "\u2813",
  i: "\u280A",
  j: "\u281A",
  k: "\u2805",
  l: "\u2807",
  m: "\u280D",
  n: "\u281D",
  o: "\u2815",
  p: "\u280F",
  q: "\u281F",
  r: "\u2817",
  s: "\u280E",
  t: "\u281E",
  u: "\u2825",
  v: "\u2827",
  w: "\u283A",
  x: "\u282D",
  y: "\u283D",
  z: "\u2835",
  " ": " ",
  ",": "\u2802",
  ";": "\u2806",
  ":": "\u2812",
  ".": "\u2832",
  "!": "\u2816",
  "?": "\u2826",
  "-": "\u2824",
  "'": "\u2804",
  '"': "\u2814",
  "\n": "\n",
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

// File upload handling
const uploadDocument = document.querySelector("#upload-document"),
  uploadTitle = document.querySelector("#upload-title");

uploadDocument.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (
    file.type === "application/pdf" ||
    file.type === "text/plain" ||
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    uploadTitle.innerHTML = file.name;
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = (e) => {
      inputTextElem.value = e.target.result;
      selectDropdownOption(inputLanguageDropdown, "auto");
      translate();
    };
  } else {
    alert("Please upload a valid file");
  }
});

// Download translated text
const downloadBtn = document.querySelector("#download-btn");
downloadBtn.addEventListener("click", () => {
  const outputText = outputTextElem.value;
  const outputLanguage = outputLanguageDropdown.querySelector(".selected").dataset.value;
  if (outputText) {
    const blob = new Blob([outputText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.download = `translated-to-${outputLanguage}.txt`;
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }
});

// Dark mode toggle
const darkModeCheckbox = document.getElementById("dark-mode-btn");
darkModeCheckbox.addEventListener("change", () => {
  document.body.classList.toggle("dark");
});

// Update input character count
const inputChars = document.querySelector("#input-chars");
inputTextElem.addEventListener("input", () => {
  inputChars.textContent = inputTextElem.value.length;
});

// Clipboard copy functionality
document.addEventListener("DOMContentLoaded", () => {
  const copyBtn = document.getElementById("copyBtn");
  const outputText = document.getElementById("output-text");

  copyBtn.addEventListener("click", () => {
    if (outputText.value.trim() !== "") {
      navigator.clipboard.writeText(outputText.value).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = "Copy to Clipboard";
        }, 1500);
      }).catch((err) => {
        console.error("Failed to copy text: ", err);
        alert("Copy failed!");
      });
    } else {
      alert("Nothing to copy!");
    }
  });
});

// Text-to-Speech functionality
const speakBtn = document.getElementById("speak-btn");
speakBtn.addEventListener("click", () => {
  const textToSpeak = outputTextElem.value.trim();
  if (!textToSpeak) {
    alert("There is no translated text to speak!");
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  const outputLangCode = outputLanguageDropdown.querySelector(".selected").dataset.value;

  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find((v) => v.lang.toLowerCase().startsWith(outputLangCode.toLowerCase()));
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.speak(utterance);
});

// Speech Recognition setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  alert("Sorry, your browser does not support Speech Recognition.");
} else {
  const recognition = new SpeechRecognition();

  recognition.lang = "en-US"; // Could be made dynamic later
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  const micButton = document.getElementById("mic-input");
  const inputTextArea = document.getElementById("input-text");

  micButton.addEventListener("click", () => {
    recognition.start();
  });

  recognition.addEventListener("start", () => {
    console.log("Speech recognition started");
    // Optionally add UI feedback here
  });

  recognition.addEventListener("result", async (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("Speech recognized:", transcript);
    inputTextArea.value = transcript;

    // Update char count
    const charCount = document.getElementById("input-chars");
    if (charCount) charCount.textContent = transcript.length;

    try {
      await translate(); // Await translation

      // Speak translated text after translation
      const translatedText = outputTextElem.value.trim();
      if (translatedText) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(translatedText);
        const outputLangCode = outputLanguageDropdown.querySelector(".selected").dataset.value || "en-US";

        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find((v) => v.lang.toLowerCase().startsWith(outputLangCode.toLowerCase()));

        if (voice) {
          utterance.voice = voice;
        }

        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.error("Translation error after speech recognition:", e);
    }
  });

  recognition.addEventListener("error", (event) => {
    console.error("Speech recognition error:", event.error);
    alert("Speech recognition error: " + event.error);
  });

  recognition.addEventListener("end", () => {
    console.log("Speech recognition ended");
    // Optionally add UI feedback here
  });
}
// Get the speech synthesis instance
const synth = window.speechSynthesis;

// Elements to attach hover-to-speak behavior
const hoverSpeakElements = [
  document.getElementById('speak-btn'),
  document.getElementById('copyBtn'),
  document.getElementById('mic-input'),
  document.querySelector('.swap-position'),
  document.querySelector('#dark-mode-btn'), // the checkbox input
  document.querySelector('#input-language .dropdown-toggle'),
  document.querySelector('#output-language .dropdown-toggle'),
];

// Utility to stop any ongoing speech
function stopSpeech() {
  if (synth.speaking) synth.cancel();
  hoverSpeakElements.forEach(el => el.classList.remove('speaking', 'hover-highlight'));
}

// Speak text and highlight element
function speakElement(el, text) {
  if (!text) return;
  stopSpeech(); // stop any previous speech
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; // adjust based on language if needed

  utterance.onstart = () => {
    el.classList.add('speaking');
  };
  utterance.onend = () => {
    el.classList.remove('speaking');
  };
  utterance.onerror = () => {
    el.classList.remove('speaking');
  };

  synth.speak(utterance);
  el.classList.add('hover-highlight');
}

// Attach event listeners to each element
hoverSpeakElements.forEach(el => {
  if (!el) return;
  el.addEventListener('mouseenter', () => {
    let textToSpeak = '';
    
    // Special cases for each element
    if (el.id === 'speak-btn') {
      textToSpeak = 'Speak translated text';
    } else if (el.id === 'copyBtn') {
      textToSpeak = 'Copy translation to clipboard';
    } else if (el.id === 'mic-input') {
      textToSpeak = 'Start speaking input';
    } else if (el.classList.contains('swap-position')) {
      textToSpeak = 'Swap input and output languages';
    } else if (el.id === 'dark-mode-btn') {
      textToSpeak = el.checked ? 'Dark mode enabled' : 'Dark mode disabled';
    } else if (el.closest('#input-language')) {
      textToSpeak = 'Select input language';
    } else if (el.closest('#output-language')) {
      textToSpeak = 'Select output language';
    }

    speakElement(el, textToSpeak);
  });

  el.addEventListener('mouseleave', () => {
    stopSpeech();
    el.classList.remove('hover-highlight', 'speaking');
  });
});
