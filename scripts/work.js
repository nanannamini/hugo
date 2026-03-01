import { slides } from "../data/slides.js";
import { scrambleIn, scrambleOut, scrambleVisible } from "./scramble.js";

import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);
gsap.config({ nullTargetWarn: false });

let currentSlideIndex = 0;
let isTransitioning = false;

// creates character elements for scramble animation
function createCharacterElements(element) {
  if (element.querySelectorAll(".char").length > 0) return;

  const words = element.textContent.split(" ");
  element.innerHTML = "";

  words.forEach((word, index) => {
    const wordDiv = document.createElement("div");
    wordDiv.className = "word";

    [...word].forEach((char) => {
      const charDiv = document.createElement("div");
      charDiv.className = "char";
      charDiv.innerHTML = `<span>${char}</span>`;
      wordDiv.appendChild(charDiv);
    });

    element.appendChild(wordDiv);

    if (index < words.length - 1) {
      const spaceChar = document.createElement("div");
      spaceChar.className = "char space-char";
      spaceChar.innerHTML = "<span> </span>";
      element.appendChild(spaceChar);
    }
  });
}

// creates line elements using splittext
function createLineElements(element) {
  new SplitText(element, { type: "lines", linesClass: "line" });
  element.querySelectorAll(".line").forEach((line) => {
    line.innerHTML = `<span>${line.textContent}</span>`;
  });
}

// adds hover effect to slide link
function addSlideLinkHover(link) {
  let isAnimating = false;
  let currentSplit = null;

  if (!link.dataset.originalColor) {
    link.dataset.originalColor = getComputedStyle(link).color;
  }

  link.addEventListener("mouseenter", () => {
    if (isAnimating) return;
    isAnimating = true;

    if (currentSplit) {
      currentSplit.wordSplit?.revert();
    }

    currentSplit = scrambleVisible(link, 0, {
      duration: 0.1,
      charDelay: 25,
      stagger: 10,
      maxIterations: 5,
    });

    setTimeout(() => {
      isAnimating = false;
    }, 250);
  });

  link.addEventListener("mouseleave", () => {
    link.style.color = link.dataset.originalColor || "";
  });
}

// processes text elements by creating character and line elements
function processTextElements(container) {
  const title = container.querySelector(".slide-title h1");
  if (title) createCharacterElements(title);

  container
    .querySelectorAll(".slide-description p")
    .forEach(createLineElements);

  const link = container.querySelector(".slide-link a");
  if (link) {
    createLineElements(link);
    addSlideLinkHover(link);
  }
}

// creates slide element with title and description
const createSlideElement = (slideData) => {
  const content = document.createElement("div");
  content.className = "slider-content";
  content.style.opacity = "0";

  content.innerHTML = `
    <div class="slide-title"><h1>${slideData.title}</h1></div>
    <div class="slide-description">
      <p>${slideData.description}</p>
      <div class="slide-info">
        <p>Type. ${slideData.type}</p>
        <p>Field. ${slideData.field}</p>
        <p>Date. ${slideData.date}</p>
      </div>
      <div class="slide-link">
        <a href="${slideData.route}">[ View Full Project ]</a>
      </div>
    </div>
  `;

  return content;
};

// updates the video source
const updateVideo = (index) => {
  const video = document.querySelector(".slide-video");
  if (!video) return;

  video.src = slides[index].video;
  video.load();
  video.play().catch(() => {});
};

// animates transition between slides with scramble effects
const animateSlideTransition = (nextIndex) => {
  const currentContent = document.querySelector(".slider-content");
  const slider = document.querySelector(".slider");

  const timeline = gsap.timeline();

  const currentTitle = currentContent.querySelector(".slide-title h1");
  if (currentTitle) {
    scrambleOut(currentTitle, 0);
  }

  timeline
    .to(
      [...currentContent.querySelectorAll(".line span")],
      {
        y: "-100%",
        duration: 0.6,
        stagger: 0.025,
        ease: "power2.inOut",
      },
      0.1
    )
    .call(
      () => {
        // fade out video, switch, fade in
        const videoContainer = document.querySelector(
          ".slide-video-container"
        );
        gsap.to(videoContainer, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            updateVideo(nextIndex);
            gsap.to(videoContainer, {
              opacity: 1,
              duration: 0.8,
              delay: 0.3,
            });
          },
        });

        const newContent = createSlideElement(slides[nextIndex]);

        timeline.kill();
        slider.appendChild(newContent);

        gsap.set(newContent.querySelectorAll("span"), { y: "100%" });

        setTimeout(() => {
          processTextElements(newContent);

          const newTitle = newContent.querySelector(".slide-title h1");
          const newLines = newContent.querySelectorAll(".line span");

          gsap.set(newLines, { y: "100%" });
          gsap.set(newContent, { opacity: 1 });

          gsap
            .timeline({
              onComplete: () => {
                isTransitioning = false;
                currentSlideIndex = nextIndex;
                currentContent.remove();
              },
            })
            .call(() => {
              if (newTitle) {
                scrambleIn(newTitle, 0);
              }
            })
            .to(
              newLines,
              {
                y: "0%",
                duration: 0.5,
                stagger: 0.1,
                ease: "power2.inOut",
              },
              0.3
            );
        }, 100);
      },
      null,
      0.8
    );
};

// sets up initial slide with proper text processing
const setupInitialSlide = () => {
  const content = document.querySelector(".slider-content");
  processTextElements(content);
  const lines = content.querySelectorAll(".line span");
  gsap.set(lines, { y: "0%" });
  updateVideo(0);
};

// handles slide change
const handleSlideChange = () => {
  if (isTransitioning) return;

  isTransitioning = true;
  const nextIndex = (currentSlideIndex + 1) % slides.length;
  animateSlideTransition(nextIndex);
};

// handles window resize events
const handleResize = () => {
  const currentContent = document.querySelector(".slider-content");
  if (!currentContent) return;

  const currentSlideData = slides[currentSlideIndex];
  const slider = document.querySelector(".slider");
  currentContent.remove();

  const newContent = createSlideElement(currentSlideData);
  slider.appendChild(newContent);

  document.fonts.ready.then(() => {
    processTextElements(newContent);
    const lines = newContent.querySelectorAll(".line span");
    gsap.set(lines, { y: "0%" });
    gsap.set(newContent, { opacity: "1" });
  });
};

window.addEventListener("load", () => {
  document.fonts.ready.then(() => {
    setupInitialSlide();
  });
});

document.addEventListener("click", (e) => {
  if (
    e.target.closest(".slide-link a") ||
    e.target.closest("nav") ||
    e.target.closest(".nav-overlay") ||
    e.target.closest(".menu-toggle-btn")
  ) {
    return;
  }
  handleSlideChange();
});
window.addEventListener("resize", handleResize);
