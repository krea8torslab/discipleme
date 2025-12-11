import { getVerse } from "./api.mjs";
import { getVerseInsight, getVersePrayer } from "./ai.mjs";
import { showModal, getStorageData, saveStorageData, updateStreakUI } from "./utils.mjs";

export class ScriptureGame {
    constructor() {
        this.container = document.getElementById("game-container");
    }

    // Initialize and start the game
    async start(book, chapter, verse) {
        this.toggleHomeVisibility(false);
        this.showContainer();

        // Initialize UI Elements
        const refPill = this.container.querySelector(".reference-pill");
        const textContainer = this.container.querySelector(".scripture-text");
        const progressBar = this.container.querySelector(".progress-bar");
        
        // Reset state
        if (progressBar) progressBar.style.width = "0%";
        if (textContainer) textContainer.innerHTML = "Loading scripture...";

        try {
            // Fetch Data
            const verseData = await getVerse(book, chapter, verse);
            
            // Render basic info
            if (refPill) refPill.textContent = verseData.reference;

            // Setup Insight Button
            this.setupInsightButton(verseData);

            // Setup Game Logic (Blanks & Word Bank)
            this.setupGamePlay(verseData, textContainer, progressBar);

        } catch (err) {
            console.error(err);
            if (textContainer) {
                textContainer.innerHTML = `Error loading verse. <br><button class="btn-primary" onclick="window.location.reload()">Try Again</button>`;
            }
        }
    }

    toggleHomeVisibility(visible) {
        const action = visible ? "remove" : "add";
        document.querySelector(".scripture-reference-section")?.classList[action]("hidden");
        document.querySelector(".difficulty-section")?.classList[action]("hidden");
        document.querySelector(".cta-section")?.classList[action]("hidden");
    }

    showContainer() {
        this.container?.classList.remove("hidden");
    }

    setupInsightButton(verseData) {
        const hintButton = this.container.querySelector(".hint-btn");
        let insightButton = this.container.querySelector(".insight-btn");

        // Create button if it doesn't exist
        if (!insightButton && hintButton) {
            insightButton = document.createElement("button");
            insightButton.className = "hint-btn insight-btn";
            insightButton.style.marginLeft = "12px";
            insightButton.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> Insight`;
            hintButton.parentNode.insertBefore(insightButton, hintButton.nextSibling);
        }

        // Attach event listener (cloning replaces old listeners)
        if (insightButton) {
            const newInsightBtn = insightButton.cloneNode(true);
            insightButton.parentNode.replaceChild(newInsightBtn, insightButton);
            
            newInsightBtn.addEventListener("click", async () => {
                const originalText = newInsightBtn.innerHTML;
                newInsightBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading...`;
                const insight = await getVerseInsight(verseData.reference, verseData.text);
                showModal("Verse Insight", insight);
                newInsightBtn.innerHTML = originalText;
            });
        }
    }

    setupGamePlay(verseData, textContainer, progressBar) {
        const words = verseData.text.split(" ");
        let html = "";
        let hiddenWords = [];
        
        // Determine difficulty
        let percentageToHide = 0.2; 
        const activeDifficultyBtn = document.querySelector(".difficulty-section button.active");
        if (activeDifficultyBtn) {
            const levelText = activeDifficultyBtn.innerText.toLowerCase();
            if (levelText.includes("medium")) percentageToHide = 0.5;
            if (levelText.includes("hard")) percentageToHide = 1.0;
        }

        // Calculate indices to hide
        const wordCount = words.length;
        const hideCount = Math.floor(wordCount * percentageToHide);
        const indicesToHide = new Set();

        if (percentageToHide === 1.0) {
            for(let i=0; i<wordCount; i++) indicesToHide.add(i);
        } else {
            const targetCount = Math.max(1, hideCount); 
            while (indicesToHide.size < targetCount && indicesToHide.size < wordCount) {
                indicesToHide.add(Math.floor(Math.random() * wordCount));
            }
        }

        // Build HTML string
        words.forEach((word, index) => {
            if (indicesToHide.has(index)) { 
                const cleanAnswer = word.replace(/[.,;!?"“”]/g, "");
                html += `<span class="blank-slot" data-answer="${cleanAnswer}">_____</span> `;
                hiddenWords.push(cleanAnswer); 
            } else {
                html += `${word} `;
            }
        });
        textContainer.innerHTML = html;

        // Setup Word Bank chips
        this.renderWordChips(hiddenWords, textContainer, progressBar, verseData);
    }

    renderWordChips(hiddenWords, textContainer, progressBar, verseData) {
        const wordChipsContainer = this.container.querySelector(".word-chips-container");
        if (!wordChipsContainer) return;

        wordChipsContainer.innerHTML = hiddenWords
            .sort(() => Math.random() - 0.5)
            .map(word => `<button class="word-chip">${word}</button>`)
            .join("");
        
        const chips = wordChipsContainer.querySelectorAll(".word-chip");
        let correctCount = 0;
        const totalBlanks = hiddenWords.length;

        // Chip click logic
        chips.forEach(chip => {
            chip.addEventListener("click", () => {
                const selectedWord = chip.innerText;
                const slots = textContainer.querySelectorAll(".blank-slot");
                let targetSlot = null;
                
                // Find first empty slot
                for (let slot of slots) {
                    if (slot.innerText === "_____") {
                        targetSlot = slot;
                        break;
                    }
                }

                if (targetSlot) {
                    const correctAnswer = targetSlot.getAttribute("data-answer");
                    targetSlot.innerText = selectedWord;
                    targetSlot.classList.add("filled");

                    if (selectedWord.trim() === correctAnswer.trim()) {
                        // Correct Answer
                        targetSlot.style.color = "var(--secondary)"; 
                        targetSlot.style.borderBottom = "none";
                        
                        correctCount++;
                        const percentage = (correctCount / totalBlanks) * 100;
                        if(progressBar) progressBar.style.width = `${percentage}%`;

                        // Check Win Condition
                        if (correctCount === totalBlanks) {
                            this.handleWin(verseData);
                        }
                    } else {
                        // Wrong Answer
                        targetSlot.style.color = "var(--accent-2)"; 
                        targetSlot.style.textDecoration = "line-through";
                    }

                    chip.remove();
                }
            });
        });

        // Setup Hint Button
        this.setupHintButton(textContainer, wordChipsContainer);
    }

    setupHintButton(textContainer, wordChipsContainer) {
        const hintButton = this.container.querySelector(".hint-btn");
        if (hintButton) {
            const newHintBtn = hintButton.cloneNode(true);
            hintButton.parentNode.replaceChild(newHintBtn, hintButton);
            
            newHintBtn.addEventListener("click", () => {
                const emptySlots = Array.from(textContainer.querySelectorAll(".blank-slot"))
                    .filter(slot => slot.innerText === "_____");
                
                if (emptySlots.length > 0) {
                    const targetSlot = emptySlots[0]; 
                    const answer = targetSlot.getAttribute("data-answer");
                    const availableChips = Array.from(wordChipsContainer.querySelectorAll(".word-chip"));
                    const matchingChip = availableChips.find(chip => chip.innerText.trim() === answer.trim());
                    if (matchingChip) matchingChip.click();
                }
            });
        }
    }

    handleWin(verseData) {
        let { streak, mastered } = getStorageData();
        const currentRef = verseData.reference;

        if (!mastered.includes(currentRef)) {
            streak++;
            mastered.push(currentRef);
            saveStorageData(streak, mastered);
            updateStreakUI();
        }
        
        setTimeout(async () => {
            const winContent = `
                <p style="margin-bottom: 1rem;">You mastered <strong>${verseData.reference}</strong>!</p>
                <button id="prayer-btn" class="btn-primary" style="width: 100%; margin-bottom: 0.5rem; background-color: var(--accent-1); color: #fff;">
                    <i class="fa-solid fa-hands-praying"></i> Generate Prayer
                </button>
            `;
            showModal("Verse Mastered! 🎉", winContent);
            
            const prayerBtn = document.getElementById("prayer-btn");
            if(prayerBtn) {
                prayerBtn.addEventListener("click", async () => {
                    prayerBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Writing...`;
                    const prayer = await getVersePrayer(verseData.reference, verseData.text);
                    showModal("Personal Prayer 🙏", prayer);
                });
            }
        }, 500);
    }
}