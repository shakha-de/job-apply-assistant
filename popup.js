// popup.js – Main logic for Job Apply Assistant

(function () {
    'use strict';

    // ─── State ───
    let currentJobData = null;
    let currentPageInfo = null;

    // ─── DOM References ───
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const statusBar = $('#statusBar');
    const pageInfo = $('#pageInfo');
    const pageTitle = $('#pageTitle');
    const btnAnalyze = $('#btnAnalyze');
    const btnGenerate = $('#btnGenerate');
    const jobInfoCard = $('#jobInfoCard');
    const jobInfoContent = $('#jobInfoContent');
    const typstSection = $('#typstSection');
    const typstOutput = $('#typstOutput');
    const btnCopy = $('#btnCopy');
    const btnDownload = $('#btnDownload');
    const toggleAiMode = $('#toggleAiMode');
    const labelGemini = $('#labelGemini');
    const labelOllama = $('#labelOllama');
    const geminiSettings = $('#geminiSettings');
    const ollamaSettings = $('#ollamaSettings');
    const apiKeyInput = $('#apiKey');
    const ollamaModelInput = $('#ollamaModel');
    const btnSaveSettings = $('#btnSaveSettings');
    const profileEditor = $('#profileEditor');
    const btnSaveProfile = $('#btnSaveProfile');
    const appTableContainer = $('#appTableContainer');
    const emptyState = $('#emptyState');
    const btnExportCsv = $('#btnExportCsv');
    const btnClearApps = $('#btnClearApps');

    // ─── Utilities ───

    function showStatus(message, type = 'info') {
        statusBar.textContent = '';
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
        statusBar.textContent = `${icons[type] || ''} ${message}`;
        statusBar.className = `status-bar visible ${type}`;
    }

    function hideStatus() {
        statusBar.className = 'status-bar';
    }

    function setLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button._origText = button.innerHTML;
            button.innerHTML = '<span class="spinner"></span> Please wait…';
        } else {
            button.disabled = false;
            if (button._origText) button.innerHTML = button._origText;
        }
    }

    function formatDate() {
        const d = new Date();
        return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    }

    function sanitizeFilename(name) {
        return name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_').toLowerCase();
    }

    // ─── Tabs ───

    $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.tab-btn').forEach(b => b.classList.remove('active'));
            $$('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            $(`#tab-${btn.dataset.tab}`).classList.add('active');

            if (btn.dataset.tab === 'applications') loadApplicationsTable();
        });
    });

    // ─── Load Settings ───

    function loadSettings() {
        chrome.storage.local.get(['apiKey', 'aiMode', 'ollamaModel', 'profile'], (data) => {
            if (data.apiKey) apiKeyInput.value = data.apiKey;
            if (data.ollamaModel) ollamaModelInput.value = data.ollamaModel;

            const isOllama = data.aiMode === 'ollama';
            toggleAiMode.checked = isOllama;
            updateToggleLabels(isOllama);

            if (data.profile) {
                profileEditor.value = JSON.stringify(data.profile, null, 2);
            }
        });
    }

    function updateToggleLabels(isOllama) {
        labelGemini.classList.toggle('active', !isOllama);
        labelOllama.classList.toggle('active', isOllama);
        geminiSettings.classList.toggle('hidden', isOllama);
        ollamaSettings.classList.toggle('hidden', !isOllama);
        
        if (isOllama) {
            loadAvailableModels();
        }
    }

    async function loadAvailableModels() {
        try {
            showStatus('Loading available models…', 'info');
            
            // Try proxy first
            let response = await fetch('http://localhost:8080/models');
            
            // Fallback to direct Ollama if proxy fails
            if (!response.ok) {
                response = await fetch('http://localhost:11434/api/tags');
            }
            
            if (!response.ok) {
                showStatus('Could not load Ollama models. Is Ollama running?', 'warning');
                return;
            }
            
            const data = await response.json();
            displayModels(data.models || []);
            hideStatus();
            
        } catch (err) {
            showStatus('Error loading models: ' + err.message, 'error');
        }
    }

    function displayModels(models) {
        let modelList = $('#ollamaModelsList');
        
        // Create list if it doesn't exist
        if (!modelList) {
            const container = $('#ollamaSettings');
            const modelInput = $('#ollamaModel');
            
            // Create a container for the model list
            const listContainer = document.createElement('div');
            listContainer.id = 'ollamaModelsContainer';
            listContainer.style.cssText = 'margin-top: 10px; margin-bottom: 10px;';
            
            const label = document.createElement('label');
            label.textContent = 'Available Models:';
            label.style.cssText = 'display: block; margin-bottom: 5px; font-size: 12px; color: var(--text-secondary);';
            
            const list = document.createElement('div');
            list.id = 'ollamaModelsList';
            list.style.cssText = 'background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px; max-height: 120px; overflow-y: auto; font-size: 12px;';
            
            listContainer.appendChild(label);
            listContainer.appendChild(list);
            
            // Insert after the model input
            modelInput.parentNode.insertBefore(listContainer, modelInput.nextSibling);
            modelList = list;
        }
        
        // Clear and populate list
        modelList.innerHTML = '';
        
        if (models.length === 0) {
            modelList.innerHTML = '<p style="color: var(--text-muted); margin: 0;">No models available</p>';
            return;
        }
        
        models.forEach(model => {
            const modelName = model.name || model;
            const modelBtn = document.createElement('button');
            modelBtn.style.cssText = `
                display: block;
                width: 100%;
                padding: 6px 8px;
                margin-bottom: 4px;
                background: var(--bg-card);
                color: var(--text-primary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                cursor: pointer;
                text-align: left;
                font-size: 12px;
                transition: var(--transition);
            `;
            modelBtn.textContent = modelName;
            
            modelBtn.addEventListener('click', () => {
                ollamaModelInput.value = modelName;
                modelBtn.style.borderColor = 'var(--accent)';
                modelBtn.style.backgroundColor = 'var(--accent-glow)';
            });
            
            modelBtn.addEventListener('mouseover', () => {
                modelBtn.style.borderColor = 'var(--accent)';
                modelBtn.style.backgroundColor = 'var(--accent-glow)';
            });
            
            modelBtn.addEventListener('mouseout', () => {
                if (ollamaModelInput.value !== modelName) {
                    modelBtn.style.borderColor = 'var(--border)';
                    modelBtn.style.backgroundColor = 'var(--bg-card)';
                }
            });
            
            modelList.appendChild(modelBtn);
        });
    }

    toggleAiMode.addEventListener('change', () => {
        updateToggleLabels(toggleAiMode.checked);
    });

    btnSaveSettings.addEventListener('click', () => {
        const aiMode = toggleAiMode.checked ? 'ollama' : 'gemini';
        chrome.storage.local.set({
            apiKey: apiKeyInput.value.trim(),
            aiMode: aiMode,
            ollamaModel: ollamaModelInput.value.trim() || 'llama3'
        }, () => {
            showStatus('Settings saved!', 'success');
            setTimeout(hideStatus, 2000);
        });
    });

    btnSaveProfile.addEventListener('click', () => {
        try {
            const profile = JSON.parse(profileEditor.value);
            chrome.storage.local.set({ profile }, () => {
                showStatus('Profile saved!', 'success');
                setTimeout(hideStatus, 2000);
            });
        } catch (e) {
            showStatus('Invalid JSON in profile: ' + e.message, 'error');
        }
    });

    // ─── AI Integration ───

    async function callAI(prompt) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(['aiMode', 'apiKey', 'ollamaModel'], async (data) => {
                const mode = data.aiMode || 'gemini';

                try {
                    if (mode === 'gemini') {
                        const apiKey = data.apiKey;
                        if (!apiKey) {
                            reject(new Error('Please enter your Gemini API Key in the settings.'));
                            return;
                        }

                        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{ parts: [{ text: prompt }] }]
                            })
                        });

                        if (!response.ok) {
                            const errBody = await response.text();
                            throw new Error(`Gemini API Error (${response.status}): ${errBody.substring(0, 200)}`);
                        }

                        const result = await response.json();
                        const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (!text) throw new Error('No response from Gemini.');
                        resolve(text);

                    } else {
                        // Ollama mode
                        const model = data.ollamaModel || 'llama3';
                        let ollamaUrl = 'http://localhost:11434/api/generate';

                        try {
                            const response = await fetch(ollamaUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    model: model,
                                    prompt: prompt,
                                    stream: false
                                })
                            });

                            if (!response.ok) {
                                throw new Error(`Ollama Error (${response.status})`);
                            }

                            const result = await response.json();
                            resolve(result.response || '');

                        } catch (fetchErr) {
                            // Try Go proxy fallback
                            try {
                                const proxyResponse = await fetch('http://localhost:8080/ollama', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        model: model,
                                        prompt: prompt,
                                        stream: false
                                    })
                                });

                                if (!proxyResponse.ok) {
                                    throw new Error(`Proxy Error (${proxyResponse.status})`);
                                }

                                const proxyResult = await proxyResponse.json();
                                resolve(proxyResult.response || '');

                            } catch (proxyErr) {
                                reject(new Error(
                                    'Connection to Ollama failed. Please check:\n' +
                                    '1. Is Ollama running? (ollama serve)\n' +
                                    '2. For CORS error: Start the Go proxy (go run proxy/main.go)'
                                ));
                            }
                        }
                    }
                } catch (err) {
                    reject(err);
                }
            });
        });
    }

    // ─── Step 1: Analyze Job Posting ───

    btnAnalyze.addEventListener('click', async () => {
        hideStatus();
        jobInfoCard.classList.add('hidden');
        typstSection.classList.add('hidden');
        btnGenerate.disabled = true;
        currentJobData = null;

        setLoading(btnAnalyze, true);
        showStatus('Reading page content…', 'info');

        try {
            // Get active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) throw new Error('No active tab found.');

            // Try injecting content script first (in case it wasn't loaded)
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });
            } catch (e) {
                // Already injected or cannot inject - continue
            }

            // Send message to content script
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tab.id, { action: 'extractText' }, (resp) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error('Page content could not be read. Please reload the page.'));
                        return;
                    }
                    resolve(resp);
                });
            });

            if (!response || !response.success) {
                throw new Error(response?.error || 'Error extracting text.');
            }

            currentPageInfo = {
                url: response.url,
                title: response.title,
                text: response.text
            };

            // Update page info
            pageTitle.textContent = response.title;
            pageInfo.classList.remove('hidden');

            showStatus('Analyzing job posting with AI…', 'info');

            // Prompt for Step 1
            const prompt = `Extract these fields from the following job posting as valid JSON without markdown:
{"position": "string", "company": "string", "requirements": ["string"], "tasks": ["string"], "location": "string"}
Text: ${response.text}`;

            const aiResponse = await callAI(prompt);

            // Parse JSON from AI response
            let parsed;
            try {
                // Try to find JSON in the response
                const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON found in response.');
                parsed = JSON.parse(jsonMatch[0]);
            } catch (parseErr) {
                throw new Error('AI response could not be parsed as JSON: ' + parseErr.message);
            }

            currentJobData = parsed;
            renderJobInfo(parsed);
            jobInfoCard.classList.remove('hidden');
            btnGenerate.disabled = false;
            showStatus('Job analysis complete!', 'success');

        } catch (err) {
            showStatus(err.message, 'error');
        } finally {
            setLoading(btnAnalyze, false);
        }
    });

    function renderJobInfo(data) {
        const html = `
      <dt>Position</dt><dd>${escHtml(data.position || '—')}</dd>
      <dt>Company</dt><dd>${escHtml(data.company || '—')}</dd>
      <dt>Location</dt><dd>${escHtml(data.location || '—')}</dd>
      <dt>Tasks</dt><dd><div class="tag-list">${(data.tasks || []).map(t => `<span class="tag">${escHtml(t)}</span>`).join('')}</div></dd>
      <dt>Requirements</dt><dd><div class="tag-list">${(data.requirements || []).map(r => `<span class="tag">${escHtml(r)}</span>`).join('')}</div></dd>
    `;
        jobInfoContent.innerHTML = html;
    }

    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── Step 2: Generate Cover Letter ───

    btnGenerate.addEventListener('click', async () => {
        if (!currentJobData) {
            showStatus('Please analyze the job posting first.', 'warning');
            return;
        }

        setLoading(btnGenerate, true);
        showStatus('Generating cover letter…', 'info');
        typstSection.classList.add('hidden');

        try {
            const profileData = await new Promise((resolve) => {
                chrome.storage.local.get(['profile'], (data) => {
                    resolve(data.profile || {});
                });
            });

            const prompt = `You are an experienced career advisor and writer who has been creating application materials for English-speaking companies for 20 years.

Write a compelling, highly professional cover letter in English for the following position.

CANDIDATE:
${JSON.stringify(profileData, null, 2)}

POSITION:
${JSON.stringify(currentJobData, null, 2)}

STRICT CONTENT AND TONE REQUIREMENTS:
- Write like a human, not like an AI. No generic phrases like "I am highly motivated" or "I look forward to hearing from you".
- Do NOT start the opening sentence with "I". Instead, start with a concrete reference to the company, the position, or your own project or achievement.
- Include specific details from the candidate profile (project name, technologies, experiences) – show real substance, not buzzwords.
- The length is exactly 3 paragraphs: (1) Why this company/position, (2) Concrete qualifications & projects that directly match the position, (3) Brief, confident closing with concrete next step.
- Vary sentence length – alternate between short and long sentences for natural reading flow.
- Use precise, active formulations ("developed", "built on", "led") instead of passive voice.
- No repetitions from the resume – the cover letter complements it, it doesn't summarize.
- Tone: professional, direct, confident – but not arrogant.
- Avoid these phrases completely: "highly motivated", "team player", "dependable", "I would be delighted", "I am convinced that", "with great interest".

TECHNICAL FORMAT – return ONLY this Typst code, nothing else:

#set page(margin: (x: 2.5cm, y: 2cm))
#set text(font: "Linux Libertine", size: 11pt, lang: "en")
#set par(justify: true, leading: 0.65em)

[Sender block: Name, Address, Phone, Email]

#v(0.5cm)

[Date right-aligned]

[Recipient block: Company, City]

#v(0.8cm)

*Application for [Position]*

#v(0.3cm)

[Cover letter text in 3 paragraphs]

#v(1cm)

Best regards,

[Name]

Return ONLY valid Typst code. No markdown, no explanations, no backticks, no comments.`;


            const aiResponse = await callAI(prompt);

            // Clean response — remove markdown code fences if present
            let typstCode = aiResponse.trim();
            typstCode = typstCode.replace(/^```(?:typst|typ)?\s*\n?/i, '');
            typstCode = typstCode.replace(/\n?```\s*$/i, '');

            typstOutput.value = typstCode;
            typstSection.classList.remove('hidden');

            // Save application entry
            await saveApplication(currentJobData, currentPageInfo?.url || '');

            showStatus('Cover letter generated successfully!', 'success');

        } catch (err) {
            showStatus(err.message, 'error');
        } finally {
            setLoading(btnGenerate, false);
        }
    });

    // ─── Copy & Download ───

    btnCopy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(typstOutput.value);
            btnCopy.textContent = '✅ Copied!';
            setTimeout(() => { btnCopy.textContent = '📋 Copy'; }, 1500);
        } catch (e) {
            // Fallback
            typstOutput.select();
            document.execCommand('copy');
            btnCopy.textContent = '✅ Copied!';
            setTimeout(() => { btnCopy.textContent = '📋 Copy'; }, 1500);
        }
    });

    btnDownload.addEventListener('click', () => {
        const company = currentJobData?.company || 'unknown';
        const filename = `cover_letter_${sanitizeFilename(company)}.typ`;
        const blob = new Blob([typstOutput.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    });

    // ─── Applications Table ───

    async function saveApplication(jobData, link) {
        return new Promise((resolve) => {
            chrome.storage.local.get(['applications'], (data) => {
                const apps = data.applications || [];
                apps.push({
                    position: jobData.position || '—',
                    company: jobData.company || '—',
                    link: link,
                    date: formatDate(),
                    status: 'Open'
                });
                chrome.storage.local.set({ applications: apps }, resolve);
            });
        });
    }

    function loadApplicationsTable() {
        chrome.storage.local.get(['applications'], (data) => {
            const apps = data.applications || [];
            if (apps.length === 0) {
                emptyState.classList.remove('hidden');
                // Remove table if it exists
                const existingTable = appTableContainer.querySelector('.app-table-wrapper');
                if (existingTable) existingTable.remove();
                return;
            }

            emptyState.classList.add('hidden');

            // Remove existing table
            const existingTable = appTableContainer.querySelector('.app-table-wrapper');
            if (existingTable) existingTable.remove();

            const wrapper = document.createElement('div');
            wrapper.className = 'app-table-wrapper';

            const statusOptions = ['Open', 'Applied', 'Interview', 'Rejected', 'Accepted'];

            let tableHtml = `
        <table class="app-table">
          <thead>
            <tr>
              <th>Position</th>
              <th>Company</th>
              <th>Link</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
      `;

            apps.forEach((app, index) => {
                const optionsHtml = statusOptions.map(s =>
                    `<option value="${s}" ${s === app.status ? 'selected' : ''}>${s}</option>`
                ).join('');

                tableHtml += `
          <tr>
            <td title="${escHtml(app.position)}">${escHtml(app.position)}</td>
            <td title="${escHtml(app.company)}">${escHtml(app.company)}</td>
            <td>${app.link ? `<a href="${escHtml(app.link)}" target="_blank" title="${escHtml(app.link)}">🔗 Open</a>` : '—'}</td>
            <td>${escHtml(app.date)}</td>
            <td><select data-index="${index}">${optionsHtml}</select></td>
          </tr>
        `;
            });

            tableHtml += '</tbody></table>';
            wrapper.innerHTML = tableHtml;
            appTableContainer.appendChild(wrapper);

            // Status change handlers
            wrapper.querySelectorAll('select').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    chrome.storage.local.get(['applications'], (data) => {
                        const apps = data.applications || [];
                        if (apps[idx]) {
                            apps[idx].status = e.target.value;
                            chrome.storage.local.set({ applications: apps });
                        }
                    });
                });
            });
        });
    }

    // ─── CSV Export ───

    btnExportCsv.addEventListener('click', () => {
        chrome.storage.local.get(['applications'], (data) => {
            const apps = data.applications || [];
            if (apps.length === 0) {
                showStatus('No applications to export.', 'warning');
                return;
            }

            const header = 'Position;Company;Link;Date;Status';
            const rows = apps.map(a =>
                `"${a.position}";"${a.company}";"${a.link}";"${a.date}";"${a.status}"`
            );
            const csv = [header, ...rows].join('\n');

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `applications_${formatDate().replace(/\./g, '-')}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
    });

    // ─── Clear Applications ───

    btnClearApps.addEventListener('click', () => {
        if (confirm('Delete all applications permanently?')) {
            chrome.storage.local.set({ applications: [] }, () => {
                loadApplicationsTable();
                showStatus('All applications deleted.', 'success');
                setTimeout(hideStatus, 2000);
            });
        }
    });

    // ─── Init ───
    loadSettings();

})();
