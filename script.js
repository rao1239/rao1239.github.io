document.addEventListener('DOMContentLoaded', () => {
    const adminControls = document.getElementById('admin-controls');
    const modalOverlay = document.getElementById('edit-modal-overlay');
    const modalContent = document.getElementById('modal-content');
    const modalSave = document.getElementById('modal-save');
    const modalCancel = document.getElementById('modal-cancel');
    const persistenceRoot = document.getElementById('roadmap-persistence-root');
    let currentEditingPost = null;
    let currentAction = null;

    // --- PERSISTENCE ENGINE ---
    const loadState = () => {
        const savedRoadmap = localStorage.getItem('roadmap_session_data');
        if (savedRoadmap && persistenceRoot) {
            persistenceRoot.innerHTML = savedRoadmap;
            console.log("Roadmap state restored.");
        }

        const savedLandingImg = localStorage.getItem('site_landing_image');
        if (savedLandingImg) {
            const landingImg = document.querySelector('.featured-post img');
            if (landingImg) landingImg.src = savedLandingImg;
        }

        // Restore custom sizes for all cards (including landing)
        document.querySelectorAll('.project-post, .roadmap-item').forEach((post, index) => {
            const savedW = localStorage.getItem(`post_w_${index}`);
            const savedH = localStorage.getItem(`post_h_${index}`);
            if (savedW) {
                post.style.flex = `0 0 ${savedW}`;
                post.style.width = savedW;
            }
            if (savedH) {
                post.style.height = savedH;
            }
        });
    };

    const syncChanges = () => {
        if (!persistenceRoot) return;
        const temp = persistenceRoot.cloneNode(true);
        // Remove transient UI elements and reel clones
        temp.querySelectorAll('.post-menu-trigger, .post-options-menu, .add-shelf-btn, .is-clone').forEach(el => el.remove());
        localStorage.setItem('roadmap_session_data', temp.innerHTML);
    };

    // --- QUICK EDIT ENGINE ---
    const initQuickEdit = () => {
        const targets = document.querySelectorAll('.roadmap-item, .project-post');
        targets.forEach((post) => {
            if (post.querySelector('.post-menu-trigger')) return;

            const trigger = document.createElement('div');
            trigger.className = 'post-menu-trigger';
            trigger.innerHTML = '<span></span>';
            post.appendChild(trigger);

            const menu = document.createElement('div');
            menu.className = 'post-options-menu';

            if (post.classList.contains('featured-post')) {
                menu.innerHTML = `
                    <div class="post-option" data-action="landing-change">Update Image</div>
                    <div class="post-option" data-action="resize">Resize Image</div>
                    <div class="post-option" data-action="edit">Edit Description</div>
                `;
            } else {
                menu.innerHTML = `
                    <div class="post-option" data-action="add">Add Photo (Upload)</div>
                    <div class="post-option" data-action="cover">Set Post Cover</div>
                    <div class="post-option" data-action="set-landing">Promote to Top</div>
                    <div class="post-option" data-action="edit">Edit Text</div>
                    <div class="post-option danger" data-action="delete">Delete Post</div>
                `;
            }
            post.appendChild(menu);

            trigger.addEventListener('click', (e) => {
                e.stopPropagation();

                // Password protection for menu access
                if (!document.body.classList.contains('admin-mode')) {
                    const pass = prompt("Authorized Personnel Only. Enter Key:");
                    if (pass !== 'anshyadav12@') {
                        alert("Access Denied.");
                        return;
                    }
                    document.body.classList.add('admin-mode');
                }

                document.querySelectorAll('.post-options-menu').forEach(m => {
                    if (m !== menu) m.classList.remove('active');
                });
                menu.classList.toggle('active');
            });

            menu.addEventListener('click', (e) => {
                e.stopPropagation();
                const option = e.target.closest('.post-option');
                if (!option) return;

                const action = option.getAttribute('data-action');
                currentEditingPost = post;
                currentAction = action;

                if (action === 'add' || action === 'landing-change') {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (event) => {
                        const file = event.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                                if (action === 'landing-change') {
                                    const landingImg = post.querySelector('img');
                                    if (landingImg) {
                                        landingImg.src = e.target.result;
                                        localStorage.setItem('site_landing_image', e.target.result);
                                    }
                                } else {
                                    window.addPhotoInternal(post, e.target.result, file.name);
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                    };
                    input.click();
                } else if (action === 'set-landing') {
                    const firstImg = post.querySelector('img');
                    if (firstImg) {
                        const landingImg = document.querySelector('.featured-post img');
                        if (landingImg) {
                            landingImg.src = firstImg.src;
                            localStorage.setItem('site_landing_image', firstImg.src);
                            alert("Landing Image Updated!");
                        }
                    }
                } else if (action === 'resize') {
                    const handle = post.querySelector('.resize-handle');
                    if (handle) {
                        handle.classList.toggle('active');
                        if (handle.classList.contains('active')) {
                            alert("Resize handle visible. Drag the corner to adjust.");
                        }
                    }
                } else if (action === 'cover') {
                    showModal('cover');
                } else if (action === 'edit') {
                    showModal('edit');
                } else if (action === 'delete') {
                    if (confirm("Permanently delete this post?")) {
                        post.remove();
                        syncChanges();
                    }
                }
                menu.classList.remove('active');
            });
        });
    };

    const showModal = (type, postType) => {
        modalContent.innerHTML = '';
        const modalTitle = document.getElementById('modal-title-text');
        if (type === 'edit') {
            modalTitle.innerText = "Edit Content";
            const title = currentEditingPost.querySelector('h3, h4');
            const caption = currentEditingPost.querySelector('.post-caption') || currentEditingPost.querySelector('p:not(.company)');
            const date = currentEditingPost.querySelector('.roadmap-date');

            modalContent.innerHTML = `
                <label>Title</label>
                <input type="text" id="edit-title" value="${title ? title.innerText.trim() : ''}">
                <label>Date / Status (optional)</label>
                <input type="text" id="edit-date" value="${date ? date.innerText.trim() : ''}">
                <label>Description / Caption</label>
                <div class="rich-text-toolbar">
                    <button class="toolbar-btn" data-tag="b">Bold</button>
                    <button class="toolbar-btn" data-tag="large">Size+</button>
                    <button class="toolbar-btn" data-tag="normal">Size-</button>
                </div>
                <textarea id="edit-caption" rows="4">${caption ? caption.innerHTML.trim() : ''}</textarea>
            `;

            // Rich Text handlers
            setTimeout(() => {
                const toolbar = document.querySelector('.rich-text-toolbar');
                const textarea = document.getElementById('edit-caption');
                toolbar.onclick = (e) => {
                    const tag = e.target.getAttribute('data-tag');
                    if (!tag) return;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const text = textarea.value;
                    const selected = text.substring(start, end);
                    if (tag === 'b') {
                        textarea.value = text.substring(0, start) + `<b>${selected}</b>` + text.substring(end);
                    } else if (tag === 'large') {
                        textarea.value = text.substring(0, start) + `<span style="font-size:1.2rem">${selected}</span>` + text.substring(end);
                    } else if (tag === 'normal') {
                        textarea.value = text.substring(0, start) + `<span style="font-size:0.9rem">${selected}</span>` + text.substring(end);
                    }
                };
            }, 0);
        } else if (type === 'add-choice') {
            modalTitle.innerText = "Choose Post Type";
            modalContent.innerHTML = `
                <div style="display:grid; gap:1rem;">
                    <button class="btn btn-light add-type" data-type="milestone">Add Professional Milestone</button>
                    <button class="btn btn-light add-type" data-type="highlight">Add Event Highlight</button>
                </div>
            `;
            setTimeout(() => {
                document.querySelectorAll('.add-type').forEach(btn => {
                    btn.onclick = () => {
                        const type = btn.getAttribute('data-type');
                        showModal('add-form', type);
                    };
                });
            }, 0);
        } else if (type === 'add-form') {
            modalTitle.innerText = postType === 'milestone' ? "Create Milestone" : "Create Event Highlight";
            modalContent.innerHTML = `
                <label>Title</label>
                <input type="text" id="new-title" placeholder="e.g. Lead Engineer">
                <label>${postType === 'milestone' ? 'Dates' : 'Metadata'}</label>
                <input type="text" id="new-meta" placeholder="e.g. 2025 - Present">
                <label>Description (Rich Text Supported)</label>
                <textarea id="new-caption" rows="4"></textarea>
                <button class="btn btn-light" id="new-photo-btn">Add Photo (Optional)</button>
                <input type="file" id="new-photo-file" accept="image/*" style="display:none">
                <div id="new-photo-preview" style="margin-top:10px; font-size:0.8rem; color:green;"></div>
            `;

            let photoData = null;
            setTimeout(() => {
                const pBtn = document.getElementById('new-photo-btn');
                const pFile = document.getElementById('new-photo-file');
                pBtn.onclick = () => pFile.click();
                pFile.onchange = (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (re) => {
                            photoData = re.target.result;
                            document.getElementById('new-photo-preview').innerText = "Photo attached: " + file.name;
                        };
                        reader.readAsDataURL(file);
                    }
                };

                // Override modalSave for this specific form
                modalSave.onclick = () => {
                    const title = document.getElementById('new-title').value;
                    const metaStr = document.getElementById('new-meta').value;
                    const caption = document.getElementById('new-caption').value;

                    const container = document.querySelectorAll('.shelf-container')[postType === 'milestone' ? 0 : 1];
                    const newElem = document.createElement('div');

                    if (postType === 'milestone') {
                        newElem.className = 'roadmap-item';
                        newElem.innerHTML = `
                            <span class="roadmap-date">${metaStr}</span>
                            <div class="roadmap-header">
                                <h3>${title}</h3>
                            </div>
                            ${photoData ? `<div class="case-study-scroller"><div class="scroller-card"><img src="${photoData}"></div></div>` : ''}
                            <p>${caption}</p>
                        `;
                    } else {
                        newElem.className = 'project-post';
                        newElem.innerHTML = `
                             ${photoData ? `<div class="inner-scroller"><div class="inner-slide"><img src="${photoData}"></div></div>` : `
                                <div class="inner-scroller"><div class="inner-slide"><div style="height:300px; background:#f0f0f0; display:flex; align-items:center; justify-content:center;">No Image</div></div></div>
                             `}
                             <div class="post-meta">
                                <h4>${title}</h4>
                                <p class="post-caption">${caption}</p>
                                <a href="#" target="_blank" class="btn-link">Details ↗</a>
                             </div>
                        `;
                    }

                    container.appendChild(newElem);
                    initQuickEdit();
                    initResizable();
                    syncChanges();
                    closeModal();
                    // Restore original save handler
                    modalSave.onclick = defaultSave;
                };
            }, 0);
        } else if (type === 'resize-info') {
            modalContent.innerHTML = `
                <p>To resize, simply <b>drag the blue handle</b> at the bottom-right corner of the image card.</p>
                <p>Your changes will be saved automatically.</p>
            `;
        }
        modalOverlay.style.display = 'flex';
    };

    const defaultSave = () => {
        if (currentAction === 'edit') {
            const newTitle = document.getElementById('edit-title').value;
            const newCaption = document.getElementById('edit-caption').value;
            const newDate = document.getElementById('edit-date') ? document.getElementById('edit-date').value : null;

            const titleElem = currentEditingPost.querySelector('h3, h4');
            const capElem = currentEditingPost.querySelector('.post-caption') || currentEditingPost.querySelector('p:not(.company)');
            const dateElem = currentEditingPost.querySelector('.roadmap-date');

            if (titleElem) titleElem.innerHTML = newTitle;
            if (capElem) capElem.innerHTML = newCaption;
            if (dateElem && newDate) dateElem.innerText = newDate;
        } else if (currentAction === 'cover') {
            const input = document.getElementById('cover-index');
            if (input) {
                const idx = parseInt(input.value) - 1;
                const scroller = currentEditingPost.querySelector('.inner-scroller') || currentEditingPost.querySelector('.case-study-scroller');
                if (scroller && scroller.children[idx]) scroller.prepend(scroller.children[idx]);
            }
        } else if (currentAction === 'resize') {
            // No longer needed via modal
        }
        syncChanges();
        closeModal();
    };

    modalSave.onclick = defaultSave;

    modalCancel.onclick = closeModal;
    function closeModal() {
        modalOverlay.style.display = 'none';
        currentEditingPost = null;
        currentAction = null;
    }

    window.addPhotoInternal = (post, dataUrl, fileName) => {
        let scroller = post.querySelector('.inner-scroller') || post.querySelector('.case-study-scroller');
        if (!scroller) {
            scroller = document.createElement('div');
            scroller.className = post.classList.contains('project-post') ? 'inner-scroller' : 'case-study-scroller';
            const meta = post.querySelector('.post-meta') || post.querySelector('.roadmap-header');
            post.insertBefore(scroller, meta);
        }
        const slide = document.createElement('div');
        slide.className = post.classList.contains('project-post') ? 'inner-slide' : 'scroller-card';
        slide.innerHTML = `<img src="${dataUrl}" alt="${fileName}">`;
        scroller.appendChild(slide);
        syncChanges();
    };

    // --- Admin Panel ---
    const adminTrigger = document.getElementById('admin-trigger');
    const adminOverlay = document.getElementById('admin-overlay');
    const closeAdmin = document.getElementById('close-admin');
    const loginBtn = document.getElementById('login-btn');
    const adminPass = document.getElementById('admin-pass');
    const passwordGate = document.getElementById('password-gate');

    if (adminTrigger) {
        adminTrigger.onclick = () => {
            const pass = prompt("Enter Admin Key to Edit Site:");
            if (pass === 'anshyadav12@') {
                document.body.classList.add('admin-mode');
                adminOverlay.style.display = 'flex';
                passwordGate.style.display = 'none';
                adminControls.style.display = 'block';

                // Keep choice button logic
                if (!adminControls.querySelector('.add-main-btn')) {
                    const addBtn = document.createElement('button');
                    addBtn.className = 'btn btn-light add-main-btn';
                    addBtn.style.width = '100%';
                    addBtn.innerText = 'Add New Post +';
                    addBtn.onclick = () => showModal('add-choice');
                    adminControls.prepend(addBtn);
                }
                alert("Admin Mode Active. Edit menus and '+' buttons are now visible.");
            } else {
                alert("Incorrect Key. Access Denied.");
            }
        };

        closeAdmin.onclick = () => {
            adminOverlay.style.display = 'none';
        };
    }

    const exportBtn = document.createElement('button');
    exportBtn.className = 'btn btn-primary';
    exportBtn.style.width = '100%';
    exportBtn.style.marginTop = '1rem';
    exportBtn.innerText = 'Download Ready-to-Publish HTML';
    exportBtn.onclick = () => {
        // Create a full clone of the document
        const fullDoc = document.documentElement.cloneNode(true);

        // Clean up UI-only elements from the clone
        fullDoc.querySelectorAll('.post-menu-trigger, .post-options-menu, .add-shelf-btn, .is-clone, .admin-overlay, #admin-trigger').forEach(el => el.remove());

        // Remove admin class if present
        fullDoc.querySelector('body').classList.remove('admin-mode');

        const htmlContent = '<!DOCTYPE html>\n' + fullDoc.outerHTML;
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'index.html';
        a.click();
        alert("Success! Your full portfolio has been downloaded as 'index.html'.\n\nYou can now upload this file to GitHub Pages, Netlify, or Vercel to get a live link.");
    };

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-light';
    clearBtn.style.width = '100%';
    clearBtn.style.marginTop = '0.5rem';
    clearBtn.style.color = '#ff3b30';
    clearBtn.innerText = 'Reset to Original Code';
    clearBtn.onclick = () => {
        if (confirm("Wipe all browser-saved changes?")) {
            localStorage.removeItem('roadmap_session_data');
            localStorage.removeItem('site_hero_image');
            location.reload();
        }
    };

    if (adminControls) {
        adminControls.appendChild(exportBtn);
        adminControls.appendChild(clearBtn);
    }

    // --- Feedback Logic ---
    const feedbackTrigger = document.getElementById('feedback-trigger');
    const feedbackModal = document.getElementById('feedback-modal-overlay');
    const feedbackCancel = document.getElementById('feedback-cancel');
    const feedbackSubmit = document.getElementById('feedback-submit');
    const feedbackText = document.getElementById('feedback-text');

    if (feedbackTrigger) {
        feedbackTrigger.onclick = () => feedbackModal.style.display = 'flex';
        feedbackCancel.onclick = () => feedbackModal.style.display = 'none';
        feedbackSubmit.onclick = () => {
            const msg = feedbackText.value.trim();
            if (msg) {
                alert("Feedback received! We will process this shortly.\n\nMessage: " + msg);
                feedbackText.value = '';
                feedbackModal.style.display = 'none';
            }
        };
    }

    // --- RESIZE DRAG LOGIC ---
    let isResizing = false;
    let lastDownX = 0, lastDownY = 0;
    let startWidth = 0, startHeight = 0;
    let activeResizer = null;

    const initResizable = () => {
        document.querySelectorAll('.project-post, .roadmap-item').forEach(post => {
            if (!post.querySelector('.resize-handle')) {
                const handle = document.createElement('div');
                handle.className = 'resize-handle';
                post.appendChild(handle);
            }

            const handle = post.querySelector('.resize-handle');
            handle.onmousedown = (e) => {
                isResizing = true;
                lastDownX = e.clientX;
                lastDownY = e.clientY;
                startWidth = post.offsetWidth;
                startHeight = post.offsetHeight;
                activeResizer = post;
                activeResizer.classList.add('resizing');
                e.preventDefault();
                e.stopPropagation();
            };
        });
    };

    window.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const deltaX = e.clientX - lastDownX;
        const deltaY = e.clientY - lastDownY;

        const newWidth = Math.max(250, startWidth + deltaX);
        const newHeight = Math.max(150, startHeight + deltaY);

        activeResizer.style.flex = `0 0 ${newWidth}px`;
        activeResizer.style.width = `${newWidth}px`;
        activeResizer.style.height = `${newHeight}px`;

        // Update inner elements for the new height
        const scroller = activeResizer.querySelector('.inner-scroller, .case-study-scroller');
        if (scroller) {
            // Subtract padding/header height approximately
            const reserved = activeResizer.classList.contains('project-post') ? 160 : 100;
            scroller.style.height = (newHeight - reserved) + 'px';
            scroller.querySelectorAll('.inner-slide, .scroller-card').forEach(slide => {
                slide.style.height = '100%';
            });
        }
    });

    window.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            activeResizer.classList.remove('resizing');

            // If it's the landing highlight, save specific key for convenience
            if (activeResizer.classList.contains('featured-post')) {
                localStorage.setItem('site_landing_image_width', activeResizer.style.width);
                localStorage.setItem('site_landing_image_height', activeResizer.style.height);
            }

            // Save indexed size for all posts (including landing)
            const allPosts = document.querySelectorAll('.project-post, .roadmap-item');
            const index = Array.from(allPosts).indexOf(activeResizer);
            if (index !== -1) {
                localStorage.setItem(`post_w_${index}`, activeResizer.style.width);
                localStorage.setItem(`post_h_${index}`, activeResizer.style.height);
            }

            syncChanges();
        }
    });

    const initShelfButtons = () => {
        document.querySelectorAll('.add-shelf-btn').forEach(btn => {
            btn.onclick = () => {
                const type = btn.getAttribute('data-type');
                showModal('add-form', type);
            };
        });
    };

    const initAutoSlide = () => {
        const shelves = document.querySelectorAll('.shelf-container');
        shelves.forEach(shelf => {
            // Only slide if content overflows
            if (shelf.scrollWidth <= shelf.clientWidth) return;

            // Clone items for seamless feel
            const originalItems = Array.from(shelf.children);
            originalItems.forEach(item => {
                const clone = item.cloneNode(true);
                clone.classList.add('is-clone'); // Mark to avoid saving
                shelf.appendChild(clone);
            });

            let isPaused = false;
            shelf.addEventListener('mouseenter', () => isPaused = true);
            shelf.addEventListener('mouseleave', () => isPaused = false);

            const scroll = () => {
                if (!isPaused && !isResizing) {
                    shelf.scrollLeft += 0.8;
                    // Reset to middle if reached "end" of clone set
                    if (shelf.scrollLeft >= (shelf.scrollWidth / 2)) {
                        shelf.scrollLeft = 0;
                    }
                }
                requestAnimationFrame(scroll);
            };
            scroll();
        });
    };

    loadState();
    initQuickEdit();
    initResizable();
    initShelfButtons();
    initAutoSlide();

    document.addEventListener('click', () => {
        document.querySelectorAll('.post-options-menu').forEach(m => m.classList.remove('active'));
    });

    const glow = document.querySelector('.cursor-glow');
    if (glow) {
        document.addEventListener('mousemove', (e) => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .hero-content, .roadmap-item, .project-post').forEach(el => observer.observe(el));
});
