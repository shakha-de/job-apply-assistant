// background.js – Service Worker for Job Apply Assistant (Manifest V3)

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
    const defaultProfile = {
        name: "Your Name",
        address: "Your Address, City, Country",
        email: "your@email.com",
        phone: "+1 ...",
        education: "Your Degree, University (current)",
        skills: ["Skill 1", "Skill 2", "Skill 3"],
        languages: ["English (C1)", "German (B2)"],
        experience: "Your Work Experience",
        projects: ["Project 1", "Project 2"],
        interests: "Your Interests"
    };

    chrome.storage.local.get(['profile', 'applications', 'aiMode', 'ollamaModel'], (result) => {
        const updates = {};
        if (!result.profile) updates.profile = defaultProfile;
        if (!result.applications) updates.applications = [];
        if (!result.aiMode) updates.aiMode = 'gemini';
        if (!result.ollamaModel) updates.ollamaModel = 'llama3';
        if (Object.keys(updates).length > 0) {
            chrome.storage.local.set(updates);
        }
    });
});
