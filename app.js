// --- Firebase Configuration ---
// استبدل الإعدادات أدناه من مشروعك في Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyDgAzRrCSpSXp6wQTj4k4LtRgy-VMact3M",
    authDomain: "aile-abd.firebaseapp.com",
    projectId: "aile-abd",
    storageBucket: "aile-abd.firebasestorage.app",
    messagingSenderId: "243705564010",
    appId: "1:243705564010:web:8168b047a077082e7bf313",
    measurementId: "G-XMNR9GSE6M"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const MATH_BRANCHES = ['الكل', 'الجبر', 'الإحصاء', 'حساب المثلثات', 'الهندسة', 'التفاضل والتكامل', 'الاستاتيكا', 'الديناميكا', 'تطبيقية', 'متجهات', 'جبر وإحتمالات', 'تأسيس'];

// Initial Data Structure
let appData = {
    grades: {
        '1mid': {
            title: 'الصف الأول الإعدادي',
            groups: ['مجموعة 1'],
            branches: ['الكل', 'جبر وإحتمالات', 'هندسة']
        },
        '2mid': {
            title: 'الصف الثاني الإعدادي',
            groups: ['مجموعة 1'],
            branches: ['الكل', 'جبر وإحتمالات', 'هندسة']
        },
        '3mid': {
            title: 'الصف الثالث الإعدادي',
            groups: ['مجموعة 1', 'مجموعة 2'],
            branches: ['الكل', 'جبر وإحتمالات', 'هندسة']
        },
        '1sec': {
            title: 'الصف الأول الثانوي',
            groups: ['مجموعة 1', 'مجموعة 2'],
            branches: ['الكل', 'الجبر', 'الهندسة', 'حساب المثلثات', 'متجهات']
        },
        '2sec': {
            title: 'الصف الثاني الثانوي',
            groups: ['مجموعة 1', 'مجموعة 2'],
            branches: ['الكل', 'الجبر', 'التفاضل والتكامل', 'حساب المثلثات', 'تطبيقية']
        },
        '3sec-sci': {
            title: 'الصف الثالث الثانوي (علمي)',
            groups: ['مجموعة 1', 'مجموعة 2'],
            branches: ['الكل', 'تطبيقية', 'الجبر', 'التفاضل والتكامل', 'حساب المثلثات']
        },
        '3sec-lit': {
            title: 'الصف الثالث الثانوي (أدبي)',
            groups: ['مجموعة 1'],
            branches: ['الكل', 'الجبر', 'التفاضل والتكامل']
        }
    },
    lessons: [],
    exams: [],
    files: [],
    vouchers: [],
    students: [],
    visits: []
};


// State
let currentState = {
    selectedGrade: null,
    selectedBranch: 'الكل',
    isAdmin: false
};

// YouTube Players Management
let ytPlayers = {};
let isYouTubeAPIReady = false;

function onYouTubeIframeAPIReady() {
    isYouTubeAPIReady = true;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialData();
    setTimeout(() => {
        document.getElementById('loader').style.opacity = '0';
        setTimeout(() => document.getElementById('loader').style.display = 'none', 500);
    }, 1000);
    initEventListeners();
    initScrollReveal();
});

function initScrollReveal() {
    const observerOptions = {
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    revealElements.forEach(el => observer.observe(el));
}



async function loadInitialData() {
    try {
        const lessonsSnap = await db.collection('lessons').get();
        appData.lessons = lessonsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const examsSnap = await db.collection('exams').get();
        appData.exams = examsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const filesSnap = await db.collection('files').get();
        appData.files = filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const vouchersSnap = await db.collection('vouchers').get();
        appData.vouchers = vouchersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Real-time listeners for meaningful admin updates
        db.collection('students').orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                appData.students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Update dashboard if currently viewing statistics or students list
                const activeSection = document.querySelector('.admin-nav li.active')?.dataset.section;
                if (currentState.isAdmin && (activeSection === 'dashboard' || activeSection === 'students-list')) {
                    renderAdminSection(activeSection);
                }
            });

        db.collection('visits').orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                appData.visits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const activeSection = document.querySelector('.admin-nav li.active')?.dataset.section;
                if (currentState.isAdmin && (activeSection === 'dashboard' || activeSection === 'visits-log')) {
                    renderAdminSection(activeSection);
                }
            });

    } catch (error) {
        console.error("Error loading data from Firebase:", error);
    }
}

function initEventListeners() {
    const adminBtn = document.getElementById('admin-login-btn');
    const modal = document.getElementById('admin-modal');
    const closeBtn = document.querySelector('.close-modal');

    adminBtn.onclick = () => {
        if (currentState.isAdmin) {
            showAdminDashboard();
        } else {
            modal.style.display = 'flex';
        }
    };
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    document.getElementById('login-confirm').onclick = checkLogin;

    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const target = btn.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${target}-tab`).classList.add('active');
        };
    });

    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (menuToggle && navLinks) {
        menuToggle.onclick = () => {
            const isActive = navLinks.classList.toggle('active');
            const icon = menuToggle.querySelector('i');
            if (isActive) {
                icon.classList.replace('fa-bars', 'fa-times');
                document.body.style.overflow = 'hidden';
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
                document.body.style.overflow = '';
            }
        };

        navLinks.querySelectorAll('a').forEach(link => {
            link.onclick = () => {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
                document.body.style.overflow = '';
            };
        });
    }
}

function selectGrade(gradeId) {
    currentState.selectedGrade = gradeId;
    currentState.selectedBranch = 'الكل';
    document.getElementById('grades').classList.add('hidden');
    document.getElementById('content-display').classList.remove('hidden');
    document.getElementById('current-grade-title').textContent = appData.grades[gradeId].title;
    renderBranchSelection();
    renderContent();
    scrollToSection('content-display');
}

function renderBranchSelection() {
    const container = document.getElementById('branch-selection');
    if (!container) return;
    container.innerHTML = '';

    // Get branches for the current grade
    const branches = appData.grades[currentState.selectedGrade]?.branches || MATH_BRANCHES;

    branches.forEach(branch => {
        const btn = document.createElement('button');
        btn.className = `branch-tab-btn ${currentState.selectedBranch === branch ? 'active' : ''}`;
        btn.textContent = branch;
        btn.onclick = () => {
            currentState.selectedBranch = branch;
            renderBranchSelection();
            renderContent();
        };
        container.appendChild(btn);
    });
}


function goBackToGrades() {
    document.getElementById('content-display').classList.add('hidden');
    document.getElementById('grades').classList.remove('hidden');
    currentState.selectedGrade = null;
    currentState.selectedGroup = null;
    scrollToSection('grades');
}

function renderContent() {
    const lessonsList = document.getElementById('lessons-list');
    const examsList = document.getElementById('exams-list');
    const filesList = document.getElementById('files-list');

    const isSystemUnlocked = localStorage.getItem('isSystemUnlocked') === 'true';

    // Helper for branch filtering
    const branchFilter = (item) => {
        const matchesGrade = item.grade === currentState.selectedGrade;
        const matchesBranch = currentState.selectedBranch === 'الكل' || item.branch === currentState.selectedBranch;
        return matchesGrade && matchesBranch;
    };

    // Lessons
    const filteredLessons = appData.lessons.filter(branchFilter);
    lessonsList.innerHTML = filteredLessons.length ? '' : '<p class="empty-msg">لا يوجد دروس مضافة في هذا الفرع حالياً</p>';

    // Check if THIS SPECIFIC GRADE is unlocked
    const isGradeUnlocked = localStorage.getItem(`unlocked_${currentState.selectedGrade}`) === 'true';

    filteredLessons.forEach(lesson => {
        const wrapperId = `vid-wrapper-${lesson.id}`;
        const playerId = `player-${lesson.id}`;
        if (isGradeUnlocked) {
            lessonsList.innerHTML += `
                <div class="item-card">
                    <div class="video-preview-wrapper" id="${wrapperId}">
                        <div id="${playerId}"></div>
                        <div class="video-overlay-shield total-shield" onclick="togglePlayPause('${lesson.id}')" ondblclick="toggleFullscreen('${wrapperId}')">
                            <div class="play-overlay">
                                <i class="fas fa-play"></i>
                            </div>
                            <div class="shield-top"></div>
                            <div class="shield-center-top"></div>
                            <div class="shield-bottom-right"></div>
                            <div class="shield-bottom-left"></div>
                            <div class="custom-controls">
                                <button class="custom-seek-btn" onclick="event.stopPropagation(); seek('${lesson.id}', -10)" title="تراجع 10 ثواني">
                                    <i class="fas fa-undo"></i>
                                </button>
                                <div class="progress-container" onclick="event.stopPropagation(); handleSeek(event, '${lesson.id}')">
                                    <div class="progress-bar" id="progress-${lesson.id}"></div>
                                </div>
                                <button class="custom-seek-btn" onclick="event.stopPropagation(); seek('${lesson.id}', 10)" title="تقدم 10 ثواني">
                                    <i class="fas fa-redo"></i>
                                </button>
                                <button class="custom-fs-btn" title="تكبير الشاشة" onclick="event.stopPropagation(); toggleFullscreen('${wrapperId}')">
                                    <i class="fas fa-expand"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="item-info">
                        <h4>${lesson.title}</h4>
                        <p>${lesson.desc}</p>
                    </div>
                </div>
            `;
            // Initialize player after element is in DOM
            setTimeout(() => initYTPlayer(lesson.id, getYouTubeId(lesson.url)), 100);
        } else {
            lessonsList.innerHTML += `
                <div class="item-card locked-card" style="position: relative;">
                    <div class="video-preview-wrapper" style="background: #121212; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px;">
                        <i class="fas fa-lock" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 15px;"></i>
                        <p style="color: white; font-weight: 700; margin-bottom: 15px;">هذا الفيديو محمي بكود تفعيل</p>
                        <div style="display: flex; gap: 10px; width: 80%;">
                            <input type="text" class="voucher-input" placeholder="أدخل الكود هنا" style="flex: 1; padding: 8px; border-radius: 5px; border: 1px solid var(--primary-color); background: #000; color: #fff;">
                            <button class="btn-primary" onclick="checkVoucher(this)">تفعيل</button>
                        </div>
                    </div>
                    <div class="item-info">
                        <h4>${lesson.title}</h4>
                        <p>${lesson.desc}</p>
                    </div>
                </div>
            `;
        }
    });

    // Exams
    const filteredExams = appData.exams.filter(branchFilter);
    examsList.innerHTML = filteredExams.length ? '' : '<p class="empty-msg">لا يوجد اختبارات مضافة في هذا الفرع حالياً</p>';
    filteredExams.forEach(exam => {
        examsList.innerHTML += `
            <div class="item-card exam-card">
                <div class="item-icon"><i class="fas fa-file-signature"></i></div>
                <div class="item-info">
                    <h4>${exam.title}</h4>
                    <p>${exam.questions.length} سؤال</p>
                    <button class="btn-primary w-100" onclick="startExam('${exam.id}')">بدأ الاختبار</button>
                </div>
            </div>
        `;
    });

    // Files
    const filteredFiles = appData.files.filter(branchFilter);
    filesList.innerHTML = filteredFiles.length ? '' : '<p class="empty-msg">لا يوجد مذكرات مضافة في هذا الفرع حالياً</p>';
    filteredFiles.forEach(file => {
        filesList.innerHTML += `
            <div class="item-card">
                <div class="item-icon" style="height: 150px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05);">
                    <i class="fas fa-file-pdf" style="font-size: 3rem; color: var(--primary-light);"></i>
                </div>
                <div class="item-info">
                    <h4>${file.title}</h4>
                    <p>متوفر الآن للتحميل أو العرض</p>
                    <a href="${file.url}" target="_blank" class="btn-primary w-100" style="text-decoration: none; display: block; text-align: center;">تحميل / عرض</a>
                </div>
            </div>
        `;
    });
}

function getYouTubeId(url) {
    if (!url) return 'dQw4w9WgXcQ';
    url = url.trim();
    if (url.length === 11 && !url.includes('/') && !url.includes('.')) return url;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : 'dQw4w9WgXcQ';
}

let currentExamData = null;
let userAnswers = [];

function startExam(id) {
    const exam = appData.exams.find(e => e.id === id);
    if (!exam || !exam.questions || exam.questions.length === 0) return alert('هذا الاختبار لا يحتوي على أسئلة');

    currentExamData = exam;
    userAnswers = new Array(exam.questions.length).fill(null);

    const modal = document.createElement('div');
    modal.id = 'exam-taking-modal';
    modal.className = 'exam-overlay';
    modal.innerHTML = `
        <div class="exam-container glass">
            <div class="exam-header">
                <h3>${exam.title}</h3>
                <span class="close-exam" onclick="closeExam()">&times;</span>
            </div>
            <div id="exam-questions-list"></div>
            <button class="btn-primary w-100" onclick="submitExam()">إنهاء الاختبار</button>
        </div>
    `;
    document.body.appendChild(modal);
    renderExamQuestions();
}

function renderExamQuestions() {
    const list = document.getElementById('exam-questions-list');
    list.innerHTML = '';
    currentExamData.questions.forEach((q, idx) => {
        list.innerHTML += `
            <div class="exam-q-block">
                <p class="q-title">${idx + 1}. ${q.text}</p>
                <div class="exam-options">
                    ${q.opts.map((opt, oIdx) => `
                        <label class="exam-opt">
                            <input type="radio" name="q${idx}" value="${oIdx + 1}" onchange="userAnswers[${idx}] = ${oIdx + 1}">
                            <span>${opt}</span>
                        </label>
                    `).join('')}
                </div>
            </div>
        `;
    });
}

function submitExam() {
    if (userAnswers.some(a => a === null)) {
        if (!confirm('لم تقم بالإجابة على جميع الأسئلة، هل تريد الاستمرار؟')) return;
    }
    let score = 0;
    currentExamData.questions.forEach((q, idx) => {
        if (parseInt(q.correct) === userAnswers[idx]) score++;
    });
    alert(`انتهى الاختبار! درجتك هي: ${score} من ${currentExamData.questions.length}`);
    closeExam();
}

function closeExam() {
    const modal = document.getElementById('exam-taking-modal');
    if (modal) modal.remove();
}

function scrollToSection(id) {
    document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}

function checkLogin() {
    const pass = document.getElementById('admin-password').value;
    if (pass === '010qwe') {
        currentState.isAdmin = true;
        document.getElementById('admin-modal').style.display = 'none';
        showAdminDashboard();
    } else {
        alert('كلمة المرور غير صحيحة');
    }
}

function showAdminDashboard() {
    const dashboard = document.getElementById('admin-dashboard');
    dashboard.classList.remove('hidden');
    const navItems = document.querySelectorAll('.admin-nav li');
    navItems.forEach(item => {
        item.onclick = () => {
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderAdminSection(item.dataset.section);

            // Close sidebar on mobile after selection
            if (window.innerWidth <= 968) {
                toggleAdminSidebar();
            }
        };
    });
    renderAdminSection('dashboard');
}

function toggleAdminSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    sidebar.classList.toggle('active');
    const icon = document.querySelector('.admin-menu-toggle i');
    if (sidebar.classList.contains('active')) {
        icon.classList.replace('fa-bars', 'fa-times');
    } else {
        icon.classList.replace('fa-times', 'fa-bars');
    }
}

function renderAdminSection(section) {
    const main = document.getElementById('admin-content-area');
    if (section === 'dashboard') {
        const usedVouchers = appData.vouchers.filter(v => v.isUsed);
        const revenue = usedVouchers.length * 50;
        const studentCount = appData.students.length;
        const totalVisits = appData.visits.length;

        main.innerHTML = `
            <h3>لوحة التحكم والإحصائيات 📊</h3>
            
            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                <div class="stat-item glass">
                    <div class="stat-icon-wrapper" style="width: 50px; height: 50px; background: rgba(34, 197, 94, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <i class="fas fa-wallet" style="color: #22c55e; font-size: 1.5rem;"></i>
                    </div>
                    <h4>${revenue} ج.م</h4>
                    <p>إجمالي الإيرادات</p>
                </div>
                <div class="stat-item glass">
                    <div class="stat-icon-wrapper" style="width: 50px; height: 50px; background: rgba(212, 175, 55, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <i class="fas fa-user-graduate" style="color: var(--primary-light); font-size: 1.5rem;"></i>
                    </div>
                    <h4>${studentCount}</h4>
                    <p>الطلاب المسجلين</p>
                </div>
                <div class="stat-item glass">
                    <div class="stat-icon-wrapper" style="width: 50px; height: 50px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <i class="fas fa-eye" style="color: #3b82f6; font-size: 1.5rem;"></i>
                    </div>
                    <h4>${totalVisits}</h4>
                    <p>إجمالي الزيارات</p>
                </div>
                <div class="stat-item glass">
                    <div class="stat-icon-wrapper" style="width: 50px; height: 50px; background: rgba(99, 102, 241, 0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
                        <i class="fas fa-file-video" style="color: #6366f1; font-size: 1.5rem;"></i>
                    </div>
                    <h4>${appData.lessons.length}</h4>
                    <p>فيديو تعليمي</p>
                </div>
            </div>

            <!-- Grade Breakdown -->
            <div class="stats-grid" style="margin-top: 30px; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
                <div class="stat-item glass type-mini">
                    <span style="font-size: 2rem; color: #a0a0a0;">1</span>
                    <h4>${appData.students.filter(s => s.grade === '1mid').length} طالب</h4>
                    <p>أولى إعدادي</p>
                </div>
                <div class="stat-item glass type-mini">
                    <span style="font-size: 2rem; color: #888;">2</span>
                    <h4>${appData.students.filter(s => s.grade === '2mid').length} طالب</h4>
                    <p>تانية إعدادي</p>
                </div>
                <div class="stat-item glass type-mini">
                    <span style="font-size: 2rem; color: var(--primary-light);">3</span>
                    <h4>${appData.students.filter(s => s.grade === '3mid').length} طالب</h4>
                    <p>تالتة إعدادي</p>
                </div>
                <div class="stat-item glass type-mini">
                    <span style="font-size: 2rem; color: #6366f1;">1</span>
                    <h4>${appData.students.filter(s => s.grade === '1sec').length} طالب</h4>
                    <p>أولى ثانوي</p>
                </div>
                <div class="stat-item glass type-mini">
                    <span style="font-size: 2rem; color: #22c55e;">2</span>
                    <h4>${appData.students.filter(s => s.grade === '2sec').length} طالب</h4>
                    <p>تانية ثانوي</p>
                </div>
                <div class="stat-item glass type-mini">
                    <span style="font-size: 2rem; color: #f59e0b;">3</span>
                    <h4>${appData.students.filter(s => s.grade === '3sec-sci' || s.grade === '3sec-lit').length} طالب</h4>
                    <p>تالتة ثانوي</p>
                </div>
            </div>

            <div class="contact-wrapper" style="margin-top: 30px;">
                <div class="contact-form-container glass">
                    <h4>إحصائيات المتابعة (Engagement) 📈</h4>
                    <div style="margin-top: 20px;">
                        <div class="feature-line">
                            <span>نسبة مشاهدة الفيديوهات:</span>
                            <div style="flex: 1; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; margin: 0 15px; position: relative; overflow: hidden;">
                                <div style="width: 85%; height: 100%; background: var(--gradient-1);"></div>
                            </div>
                            <span>85%</span>
                        </div>
                        <div class="feature-line" style="margin-top: 15px;">
                            <span>معدل إكمال الدروس:</span>
                            <div style="flex: 1; height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; margin: 0 15px; position: relative; overflow: hidden;">
                                <div style="width: 62%; height: 100%; background: #6366f1;"></div>
                            </div>
                            <span>62%</span>
                        </div>
                    </div>
                </div>

                <div class="contact-form-container glass">
                    <h4>وقت الذروة للمذاكرة ⏰</h4>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">أفضل أوقات تواجد الطلاب (للبث المباشر)</p>
                    <div style="height: 150px; display: flex; align-items: flex-end; gap: 10px; margin-top: 20px; padding: 10px; border-bottom: 2px solid var(--glass-border);">
                        <div style="flex: 1; height: 30%; background: var(--glass-border); border-radius: 5px 5px 0 0;" title="صياحاً"></div>
                        <div style="flex: 1; height: 50%; background: var(--glass-border); border-radius: 5px 5px 0 0;" title="ظهراً"></div>
                        <div style="flex: 1; height: 90%; background: var(--gradient-1); border-radius: 5px 5px 0 0;" title="مساءً (الذروة)"></div>
                        <div style="flex: 1; height: 70%; background: var(--glass-border); border-radius: 5px 5px 0 0;" title="ليلاً"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">
                        <span>صباحاً</span>
                        <span>ظهراً</span>
                        <span>مساءً</span>
                        <span>ليلاً</span>
                    </div>
                </div>
            </div>

            <div class="vouchers-table-container" style="margin-top: 30px;">
                <h4 style="padding: 20px;">النمو المالي والطلابي (آخر 30 يوم) 📅</h4>
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>الفترة</th>
                            <th>الطلاب الجدد</th>
                            <th>الكورسات الأكثر طلباً</th>
                            <th>الإيرادات</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>اليوم</td>
                            <td>+${Math.floor(Math.random() * 10)}</td>
                            <td>ثالثة ثانوي - جبر</td>
                            <td>${Math.floor(Math.random() * 500)} ج.م</td>
                        </tr>
                        <tr>
                            <td>هذا الأسبوع</td>
                            <td>+${Math.floor(Math.random() * 50) + 10}</td>
                            <td>تفاضل وتكامل</td>
                            <td>${Math.floor(Math.random() * 2000) + 1000} ج.م</td>
                        </tr>
                        <tr>
                            <td>هذا الشهر</td>
                            <td>+${usedVouchers.length}</td>
                            <td>المراجعة النهائية</td>
                            <td>${revenue} ج.م</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    } else if (section === 'add-lesson') {
        main.innerHTML = `
            <h3>إضافة درس جديد</h3>
            <div class="admin-form-container">
                <div class="form-group">
                    <label>رابط اليوتيوب</label>
                    <input type="text" id="lesson-url" placeholder="https://youtube.com/...">
                </div>
                <div class="form-group">
                    <label>عنوان الدرس</label>
                    <input type="text" id="lesson-title" placeholder="أدخل عنوان الفيديو">
                </div>
                <div class="form-group">
                    <label>وصف الفيديو / رقم الوحدة</label>
                    <input type="text" id="lesson-desc" placeholder="مثلاً: شرح الوحدة الأولى">
                </div>
                <div class="form-group">
                    <label>الفرع / المادة</label>
                    <select id="lesson-branch">
                        ${MATH_BRANCHES.filter(b => b !== 'الكل').map(b => `<option value="${b}">${b}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>المرحلة</label>
                    <select id="lesson-grade" onchange="updateAdminBranches('lesson')">
                        <option value="1mid">الصف الأول الإعدادي</option>
                        <option value="2mid">الصف الثاني الإعدادي</option>
                        <option value="3mid">الصف الثالث الإعدادي</option>
                        <option value="1sec">الصف الأول الثانوي</option>
                        <option value="2sec">الصف الثاني الثانوي</option>
                        <option value="3sec-sci">الصف الثالث الثانوي (علمي)</option>
                        <option value="3sec-lit">الصف الثالث الثانوي (أدبي)</option>
                    </select>
                </div>
            </div>
            <button class="btn-primary" onclick="saveNewLesson()">
                <i class="fas fa-save"></i> حفظ الدرس
            </button>

            <hr style="margin: 40px 0; border: 1px solid var(--glass-border);">
            
            <h3>إدارة الدروس المضافة</h3>
            <div class="vouchers-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>العنوان</th>
                            <th>المرحلة</th>
                            <th>الفرع</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.lessons.slice().reverse().map(l => `
                            <tr>
                                <td>${l.title}</td>
                                <td>${appData.grades[l.grade]?.title || l.grade}</td>
                                <td>${l.branch}</td>
                                <td>
                                    <button class="btn-primary" style="background: #ef4444; padding: 5px 10px;" onclick="deleteItem('lessons', '${l.id}')">
                                        <i class="fas fa-trash"></i> حذف
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (section === 'add-exam') {
        main.innerHTML = `
            <h3>إضافة اختبار جديد</h3>
            <div class="admin-form-container">
                <div class="form-group">
                    <label>عنوان الاختبار</label>
                    <input type="text" id="exam-title" placeholder="مثلاً: اختبار الجبر الشامل">
                </div>
                <div class="form-group">
                    <label>الفرع / المادة</label>
                    <select id="exam-branch">
                        ${MATH_BRANCHES.filter(b => b !== 'الكل').map(b => `<option value="${b}">${b}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>المرحلة</label>
                    <select id="exam-grade" onchange="updateAdminBranches('exam')">
                        <option value="1mid">الصف الأول الإعدادي</option>
                        <option value="2mid">الصف الثاني الإعدادي</option>
                        <option value="3mid">الصف الثالث الإعدادي</option>
                        <option value="1sec">الصف الأول الثانوي</option>
                        <option value="2sec">الصف الثاني الثانوي</option>
                        <option value="3sec-sci">الصف الثالث الثانوي (علمي)</option>
                        <option value="3sec-lit">الصف الثالث الثانوي (أدبي)</option>
                    </select>
                </div>
            </div>
            <div id="questions-container">
                <h4>الأسئلة</h4>
                <div class="question-block glass">
                    <div class="form-group">
                        <label>السؤال 1</label>
                        <textarea class="q-text" placeholder="أدخل نص السؤال"></textarea>
                    </div>
                    <div class="options-grid">
                        <input type="text" class="opt1" placeholder="الاختيار 1">
                        <input type="text" class="opt2" placeholder="الاختيار 2">
                        <input type="text" class="opt3" placeholder="الاختيار 3">
                        <input type="text" class="opt4" placeholder="الاختيار 4">
                    </div>
                    <div class="form-group">
                        <label>رقم الإجابة الصحيحة</label>
                        <select class="correct-idx">
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="hero-btns" style="margin-top: 20px;">
                <button class="btn-secondary" onclick="addNewQuestionBlock()">
                    <i class="fas fa-plus"></i> إضافة سؤال جديد
                </button>
                <button class="btn-primary" onclick="saveNewExam()">
                    <i class="fas fa-save"></i> حفظ الاختبار بالكامل
                </button>
            </div>

            <hr style="margin: 40px 0; border: 1px solid var(--glass-border);">
            
            <h3>إدارة الاختبارات المضافة</h3>
            <div class="vouchers-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>العنوان</th>
                            <th>المرحلة</th>
                            <th>الفرع</th>
                            <th>الأسئلة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.exams.slice().reverse().map(e => `
                            <tr>
                                <td>${e.title}</td>
                                <td>${appData.grades[e.grade]?.title || e.grade}</td>
                                <td>${e.branch}</td>
                                <td>${e.questions?.length || 0} سؤال</td>
                                <td>
                                    <button class="btn-primary" style="background: #ef4444; padding: 5px 10px;" onclick="deleteItem('exams', '${e.id}')">
                                        <i class="fas fa-trash"></i> حذف
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (section === 'add-file') {
        main.innerHTML = `
            <h3>إضافة ملف أو مذكرة جديدة</h3>
            <div class="admin-form-container">
                <div class="form-group">
                    <label>رابط الملف (Google Drive/Dropbox)</label>
                    <input type="text" id="file-url" placeholder="https://drive.google.com/...">
                </div>
                <div class="form-group">
                    <label>عنوان الملف</label>
                    <input type="text" id="file-title" placeholder="أدخل اسم المذكرة">
                </div>
                <div class="form-group">
                    <label>الفرع / المادة</label>
                    <select id="file-branch">
                        ${MATH_BRANCHES.filter(b => b !== 'الكل').map(b => `<option value="${b}">${b}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>المرحلة</label>
                    <select id="file-grade" onchange="updateAdminBranches('file')">
                        <option value="1mid">الصف الأول الإعدادي</option>
                        <option value="2mid">الصف الثاني الإعدادي</option>
                        <option value="3mid">الصف الثالث الإعدادي</option>
                        <option value="1sec">الصف الأول الثانوي</option>
                        <option value="2sec">الصف الثاني الثانوي</option>
                        <option value="3sec-sci">الصف الثالث الثانوي (علمي)</option>
                        <option value="3sec-lit">الصف الثالث الثانوي (أدبي)</option>
                    </select>
                </div>
            </div>
            <button class="btn-primary" onclick="saveNewFile()">
                <i class="fas fa-save"></i> حفظ الملف
            </button>

            <hr style="margin: 40px 0; border: 1px solid var(--glass-border);">
            
            <h3>إدارة المذكرات المضافة</h3>
            <div class="vouchers-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>العنوان</th>
                            <th>المرحلة</th>
                            <th>الفرع</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.files.slice().reverse().map(f => `
                            <tr>
                                <td>${f.title}</td>
                                <td>${appData.grades[f.grade]?.title || f.grade}</td>
                                <td>${f.branch}</td>
                                <td>
                                    <button class="btn-primary" style="background: #ef4444; padding: 5px 10px;" onclick="deleteItem('files', '${f.id}')">
                                        <i class="fas fa-trash"></i> حذف
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (section === 'vouchers') {
        const unusedCount = appData.vouchers.filter(v => !v.isUsed).length;

        // Detailed breakdown
        const stats = {
            '3mid': appData.vouchers.filter(v => v.grade === '3mid').length,
            '1sec': appData.vouchers.filter(v => v.grade === '1sec').length,
            '2sec': appData.vouchers.filter(v => v.grade === '2sec').length,
            '3sec': appData.vouchers.filter(v => v.grade === '3sec').length,
        };

        main.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>نظام أكواد التفعيل المتخصصة 🔑</h3>
                <div style="display: flex; gap: 10px;">
                    <select id="voucher-grade-filter" style="width: auto; margin-top: 0; padding: 5px 15px;" onchange="filterVouchersByGrade(this.value)">
                        <option value="all">كل المراحل</option>
                        <option value="1mid">1 إعدادي</option>
                        <option value="2mid">2 إعدادي</option>
                        <option value="3mid">3 إعدادي</option>
                        <option value="1sec">1 ثانوي</option>
                        <option value="2sec">2 ثانوي</option>
                        <option value="3sec">3 ثانوي</option>
                    </select>
                </div>
            </div>

            <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); margin-bottom: 30px;">
                <div class="stat-item glass">
                    <h4 style="color: var(--primary-light);">${appData.vouchers.length}</h4>
                    <p>الإجمالي</p>
                </div>
                <div class="stat-item glass">
                    <h4 style="color: #22c55e;">${unusedCount}</h4>
                    <p>أكواد متاحة</p>
                </div>
                <div class="stat-item glass">
                    <h4 style="color: #6366f1;">${appData.vouchers.filter(v => v.grade === '1mid').length}</h4>
                    <p>1 إعدادي</p>
                </div>
                <div class="stat-item glass">
                    <h4 style="color: #22c55e;">${appData.vouchers.filter(v => v.grade === '2mid').length}</h4>
                    <p>2 إعدادي</p>
                </div>
                <div class="stat-item glass">
                    <h4 style="color: #f59e0b;">${appData.vouchers.filter(v => v.grade === '3mid').length}</h4>
                    <p>3 إعدادي</p>
                </div>
                <div class="stat-item glass">
                    <h4 style="color: #6366f1;">${appData.vouchers.filter(v => v.grade === '1sec').length}</h4>
                    <p>1 ثانوي</p>
                </div>
                <div class="stat-item glass">
                    <h4 style="color: #ef4444;">${appData.vouchers.filter(v => v.grade === '2sec').length}</h4>
                    <p>2 ثانوي</p>
                </div>
                <div class="stat-item glass">
                    <h4 style="color: #a855f7;">${appData.vouchers.filter(v => v.grade === '3sec').length}</h4>
                    <p>3 ثانوي</p>
                </div>
            </div>
            
            <div class="hero-btns" style="margin-bottom: 30px;">
                <button class="btn-primary" onclick="generateVouchers()">
                    <i class="fas fa-magic"></i> توليد 1000 كود جديد
                </button>
            </div>

            <div class="vouchers-table-container">
                <table id="vouchers-main-table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">م</th>
                            <th>الكود</th>
                            <th>المرحلة</th>
                            <th>اسم الطالب/ملاحظة</th>
                            <th>الحالة</th>
                            <th>إجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="vouchers-table-body">
                        ${renderVoucherRows(appData.vouchers)}
                    </tbody>
                </table>
            </div>
        `;
    } else if (section === 'students-list') {
        main.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3>قائمة الطلاب المسجلين 🎓</h3>
                <button class="btn-primary" onclick="printStudentsList()">
                    <i class="fas fa-print"></i> طباعة القائمة
                </button>
            </div>
            
            <div class="vouchers-table-container">
                <table id="printable-students-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>رقم الهاتف</th>
                            <th>المرحلة الدراسية</th>
                            <th>تاريخ التسجيل</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.students.map(s => `
                            <tr>
                                <td>${s.name}</td>
                                <td style="font-family: monospace;">${s.phone || 'N/A'}</td>
                                <td>${appData.grades[s.grade]?.title || s.grade}</td>
                                <td>${new Date(s.createdAt).toLocaleDateString('ar-EG')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (section === 'visits-log') {
        main.innerHTML = `
            <h3>سجل الزيارات اليومية 🕒</h3>
            <p style="color: var(--text-muted); margin-bottom: 20px;">متابعة لحظية لدخول الطلاب للمنصة</p>
            
            <div class="vouchers-table-container">
                <table>
                    <thead>
                        <tr>
                            <th>الطالب</th>
                            <th>المرحلة</th>
                            <th>وقت الزيارة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${appData.visits.map(v => `
                            <tr>
                                <td>${v.studentName}</td>
                                <td>${appData.grades[v.grade]?.title || v.grade}</td>
                                <td style="direction: ltr; text-align: right;">${new Date(v.timestamp).toLocaleString('ar-EG')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } else if (section === 'manage-groups') {
        main.innerHTML = `<h3>إدارة المجموعات</h3><p>يمكنك تعديل أسماء المجموعات من خلال مصفوفة appData في ملف app.js حالياً.</p>`;
    } else if (section === 'settings') {
        main.innerHTML = `<h3>الإعدادات</h3><p>الإعدادات العامة للمنصة ستتوفر قريباً.</p>`;
    } else if (section === 'reset-system') {
        main.innerHTML = `
            <div class="glass" style="padding: 40px; border: 1px solid #ef4444; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #ef4444; margin-bottom: 20px;"></i>
                <h2 style="color: #ef4444; margin-bottom: 20px;">تصفير النظام بالكامل</h2>
                <p style="font-size: 1.2rem; margin-bottom: 30px;">
                    انتبه! هذه العملية ستقوم بحذف <b>كل شيء</b> قمت بإضافته (الدروس، الاختبارات، المذكرات، الطلاب، سجلات الزيارات، وأكواد التفعيل).
                    <br>
                    استخدم هذا الخيار فقط إذا كنت مستعداً لبدء العمل الرسمي وتصفير بيانات التدريب السابقة.
                </p>
                <div style="display: flex; gap: 20px; justify-content: center;">
                    <button class="btn-primary" style="background: #ef4444; padding: 15px 40px; font-size: 1.1rem;" onclick="resetFullSystem()">
                        <i class="fas fa-trash-alt"></i> نعم، قم بتصفير النظام الآن
                    </button>
                    <button class="btn-primary" style="background: #6366f1; padding: 15px 40px; font-size: 1.1rem;" onclick="renderAdminSection('dashboard')">
                        إلغاء والعودة
                    </button>
                </div>
            </div>
        `;
    }

    if (section === 'add-lesson') updateAdminBranches('lesson');
    if (section === 'add-exam') updateAdminBranches('exam');
    if (section === 'add-file') updateAdminBranches('file');
}

let questionCount = 1;
function addNewQuestionBlock() {
    questionCount++;
    const container = document.getElementById('questions-container');
    const block = document.createElement('div');
    block.className = 'question-block glass';
    block.innerHTML = `
        <div class="form-group">
            <label>السؤال ${questionCount}</label>
            <textarea class="q-text" placeholder="أدخل نص السؤال"></textarea>
        </div>
        <div class="options-grid">
            <input type="text" class="opt1" placeholder="الاختيار 1">
            <input type="text" class="opt2" placeholder="الاختيار 2">
            <input type="text" class="opt3" placeholder="الاختيار 3">
            <input type="text" class="opt4" placeholder="الاختيار 4">
        </div>
        <div class="form-group">
            <label>رقم الإجابة الصحيحة</label>
            <select class="correct-idx">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
            </select>
        </div>
    `;
    container.appendChild(block);
}

async function saveNewLesson() {
    const url = document.getElementById('lesson-url').value;
    const title = document.getElementById('lesson-title').value;
    const desc = document.getElementById('lesson-desc').value;
    const grade = document.getElementById('lesson-grade').value;
    const branch = document.getElementById('lesson-branch').value;
    if (!url || !title) return alert('برجاء ملء البيانات');
    const newLesson = {
        url, title, grade, branch, desc: desc || 'درس فيديو توضيحي',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        const docRef = await db.collection('lessons').add(newLesson);
        newLesson.id = docRef.id;
        appData.lessons.push(newLesson);
        alert('تم الحفظ بنجاح في السحابة');
        if (currentState.selectedGrade === grade) renderContent();
        renderAdminSection('add-lesson');
    } catch (error) {
        console.error("Error saving lesson:", error);
        alert('فشل الحفظ في قاعدة البيانات');
    }
}

async function saveNewExam() {
    const title = document.getElementById('exam-title').value;
    const grade = document.getElementById('exam-grade').value;
    const branch = document.getElementById('exam-branch').value;
    const blocks = document.querySelectorAll('.question-block');
    if (!title) return alert('برجاء إدخال عنوان الاختبار');
    let questions = [];
    blocks.forEach(block => {
        const text = block.querySelector('.q-text').value;
        const opts = [
            block.querySelector('.opt1').value,
            block.querySelector('.opt2').value,
            block.querySelector('.opt3').value,
            block.querySelector('.opt4').value
        ];
        const correct = block.querySelector('.correct-idx').value;
        if (text && opts.every(o => o)) questions.push({ text, opts, correct });
    });
    if (questions.length === 0) return alert('برجاء إضافة سؤال واحد على الأقل مع كافة بياناته');
    const newExam = {
        title, grade, branch, questions,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        const docRef = await db.collection('exams').add(newExam);
        newExam.id = docRef.id;
        appData.exams.push(newExam);
        alert('تم حفظ الاختبار بنجاح في السحابة');
        if (currentState.selectedGrade === grade) renderContent();
        questionCount = 1;
        renderAdminSection('add-exam');
    } catch (error) {
        console.error("Error saving exam:", error);
        alert('حدث خطأ أثناء حفظ الاختبار');
    }
}

async function saveNewFile() {
    const url = document.getElementById('file-url').value;
    const title = document.getElementById('file-title').value;
    const grade = document.getElementById('file-grade').value;
    const branch = document.getElementById('file-branch').value;
    if (!url || !title) return alert('برجاء ملء البيانات');
    const newFile = {
        url, title, grade, branch,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try {
        const docRef = await db.collection('files').add(newFile);
        newFile.id = docRef.id;
        appData.files.push(newFile);
        alert('تم حفظ الملف بنجاح');
        if (currentState.selectedGrade === grade) renderContent();
        renderAdminSection('add-file');
    } catch (error) {
        console.error("Error saving file:", error);
        alert('فشل الحفظ في قاعدة البيانات');
    }
}

function logout() {
    currentState.isAdmin = false;
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function hideAdminDashboard() {
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function sendWhatsAppMessage(event) {
    event.preventDefault();
    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    const grade = document.getElementById('contact-grade').value;
    const message = document.getElementById('contact-message').value;
    const whatsappNumber = "201010034756";
    const text = `*رسالة جديدة من الموقع*%0A%0A` +
        `*الاسم:* ${name}%0A` +
        `*رقم الهاتف:* ${phone}%0A` +
        `*المرحلة:* ${grade}%0A` +
        `*الرسالة:* ${message}`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${text}`;
    window.open(whatsappUrl, '_blank');
}

// --- Voucher Management ---
function generateRandomCode(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function generateVouchers() {
    const gradesToGen = [
        { id: '1mid', title: '1 إعدادي' },
        { id: '2mid', title: '2 إعدادي' },
        { id: '3mid', title: '3 إعدادي' },
        { id: '1sec', title: '1 ثانوي' },
        { id: '2sec', title: '2 ثانوي' },
        { id: '3sec', title: '3 ثانوي' }
    ];

    if (!confirm('هل أنت متأكد من توليد أكواد لجميع المراحل (100 كود لكل مرحلة)؟')) return;

    const newVouchers = [];
    const chunks = [];

    // Create 100 vouchers per grade
    gradesToGen.forEach(g => {
        for (let i = 0; i < 100; i++) {
            const code = generateRandomCode(10);
            newVouchers.push({
                code: code,
                grade: g.id,
                isUsed: false,
                isActive: true,
                note: '',
                createdAt: new Date().toISOString()
            });
        }
    });

    // Firestore batch limit is 500
    for (let i = 0; i < newVouchers.length; i += 500) {
        chunks.push(newVouchers.slice(i, i + 500));
    }

    try {
        for (const chunk of chunks) {
            const batch = db.batch();
            chunk.forEach(vData => {
                const ref = db.collection('vouchers').doc();
                batch.set(ref, vData);
                vData.id = ref.id;
            });
            await batch.commit();
        }

        appData.vouchers.push(...newVouchers);
        alert('تم توليد 1000 كود بنجاح (250 لكل مرحلة) وحفظهم في السحابة');
        renderAdminSection('vouchers');
    } catch (error) {
        console.error("Error generating vouchers:", error);
        alert('حدث خطأ أثناء توليد الأكواد');
    }
}

async function checkVoucher(btn) {
    const input = btn.previousElementSibling;
    const code = input.value.trim().toUpperCase();
    if (!code) return alert('برجاء إدخال الكود');

    // Find in appData first
    const voucher = appData.vouchers.find(v => v.code === code);

    if (voucher) {
        if (voucher.isUsed) return alert('هذا الكود تم استخدامه من قبل');
        if (voucher.isActive === false) return alert('تم إغلاق هذا الكود من قبل الإدارة، برجاء التواصل مع الأستاذ');

        // Verify if voucher matches current selected grade
        let currentGrade = currentState.selectedGrade;
        let voucherCategory = currentGrade.startsWith('3sec') ? '3sec' : currentGrade;

        if (voucher.grade && voucher.grade !== voucherCategory) {
            return alert('هذا الكود مخصص لمرحلة دراسية أخرى، برجاء إدخال كود مخصص لهذه المرحلة');
        }

        try {
            await db.collection('vouchers').doc(voucher.id).update({
                isUsed: true,
                usedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            voucher.isUsed = true;

            // Unlock specific grade
            localStorage.setItem(`unlocked_${currentGrade}`, 'true');

            alert('تم تفعيل هذه المرحلة بنجاح! يمكنك الآن مشاهدة جميع الدروس الخاصة بها.');
            renderContent();
        } catch (error) {
            console.error("Error updating voucher status:", error);
            alert('فشل تفعيل الكود، تأكد من اتصالك بالإنترنت');
        }
    } else {
        alert('كود غير صحيح، تأكد من كتابة الكود بشكل صحيح');
    }
}



function printStudentsList() {
    const table = document.getElementById('printable-students-table').outerHTML;
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>قائمة الطلاب</title>');
    win.document.write('<style>body{direction:rtl; font-family: Tahoma; padding: 20px;} table{width:100%; border-collapse:collapse; margin-top:20px;} th,td{border:1px solid #ddd; padding:12px; text-align:right;} th{background:#f4f4f4;} h2{text-align:center;}</style>');
    win.document.write('</head><body>');
    win.document.write('<h2>قائمة الطلاب المسجلين - منصة الأستاذ علي عبد الوهاب</h2>');
    win.document.write(table);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
}

async function logVisit(student) {
    if (!student) return;

    // Prevent multiple logs in the same session (tab open)
    if (sessionStorage.getItem('visitLogged')) return;

    const visitData = {
        studentName: student.name,
        phone: student.phone,
        grade: student.grade,
        timestamp: new Date().toISOString()
    };
    try {
        await db.collection('visits').add(visitData);
        appData.visits.unshift(visitData); // Local update
        sessionStorage.setItem('visitLogged', 'true');
    } catch (error) {
        console.error("Error logging visit:", error);
    }
}

function openIntroVideo() {
    const modal = document.getElementById('intro-modal');
    const videoId = 'c7EwMgecsVk';
    modal.style.display = 'flex';

    if (ytPlayers['intro']) {
        ytPlayers['intro'].loadVideoById(videoId);
    } else {
        initYTPlayer('intro', videoId, 'intro-video-iframe');
    }
}

function initYTPlayer(id, videoId, elementId = null) {
    if (!isYouTubeAPIReady) {
        setTimeout(() => initYTPlayer(id, videoId, elementId), 500);
        return;
    }

    const targetId = elementId || `player-${id}`;

    // Clean up old player if exists
    if (ytPlayers[id]) {
        try { ytPlayers[id].destroy(); } catch (e) { }
    }

    ytPlayers[id] = new YT.Player(targetId, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 0,
            'controls': 1,
            'modestbranding': 1,
            'rel': 0,
            'showinfo': 0,
            'iv_load_policy': 3,
            'disablekb': 1,
            'fs': 0,
            'enablejsapi': 1,
            'origin': window.location.origin
        },
        events: {
            'onStateChange': (event) => onPlayerStateChange(event, id)
        }
    });
}

function onPlayerStateChange(event, id) {
    const wrapper = id === 'intro' ? document.getElementById('intro-video-wrapper') : document.getElementById(`vid-wrapper-${id}`);
    if (!wrapper) return;
    const playIcon = wrapper.querySelector('.play-overlay i');
    const playOverlay = wrapper.querySelector('.play-overlay');

    if (event.data == YT.PlayerState.PLAYING) {
        if (playOverlay) playOverlay.style.opacity = '0';
        if (playIcon) playIcon.className = 'fas fa-pause';
        startProgressLoop(id);
    } else {
        if (playOverlay) playOverlay.style.opacity = '1';
        if (playIcon) playIcon.className = 'fas fa-play';
        stopProgressLoop(id);
    }
}

let progressIntervals = {};

function startProgressLoop(id) {
    stopProgressLoop(id);
    progressIntervals[id] = setInterval(() => {
        const player = ytPlayers[id];
        const progressBar = document.getElementById(`progress-${id}`);
        if (player && progressBar && player.getCurrentTime) {
            const currentTime = player.getCurrentTime();
            const duration = player.getDuration();
            const percent = (currentTime / duration) * 100;
            progressBar.style.width = `${percent}%`;
        }
    }, 1000);
}

function stopProgressLoop(id) {
    if (progressIntervals[id]) {
        clearInterval(progressIntervals[id]);
        delete progressIntervals[id];
    }
}

function handleSeek(event, id) {
    const player = ytPlayers[id];
    if (!player) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    const percent = x / width;
    const duration = player.getDuration();
    if (duration > 0) {
        player.seekTo(duration * percent, true);
    }
}

function togglePlayPause(id) {
    const player = ytPlayers[id];
    if (!player) return;

    const state = player.getPlayerState();
    if (state == YT.PlayerState.PLAYING) {
        player.pauseVideo();
    } else {
        player.playVideo();
    }
}

// Custom Fullscreen Handler
function toggleFullscreen(wrapperId) {
    const elem = document.getElementById(wrapperId);
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Seek functionality
function seek(id, seconds) {
    const player = ytPlayers[id];
    if (player && player.getCurrentTime) {
        const currentTime = player.getCurrentTime();
        player.seekTo(currentTime + seconds, true);
    }
}

// Disable right-click on video wrappers to prevent context menu redirects
document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.video-preview-wrapper, .video-container-wrapper')) {
        e.preventDefault();
        return false;
    }
});

function closeIntroVideo() {
    const modal = document.getElementById('intro-modal');
    if (ytPlayers['intro']) {
        ytPlayers['intro'].stopVideo();
    }
    modal.style.display = 'none';
}

function updateAdminBranches(type) {
    const gradeSelect = document.getElementById(`${type}-grade`);
    const branchSelect = document.getElementById(`${type}-branch`);
    if (!gradeSelect || !branchSelect) return;
    const selectedGrade = gradeSelect.value;

    const branches = appData.grades[selectedGrade]?.branches || MATH_BRANCHES;

    branchSelect.innerHTML = branches
        .filter(b => b !== 'الكل')
        .map(b => `<option value="${b}">${b}</option>`)
        .join('');
}
async function deleteItem(collection, id) {
    if (!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return;
    try {
        await db.collection(collection).doc(id).delete();
        // تحديث البيانات محلياً
        appData[collection] = appData[collection].filter(item => item.id !== id);
        alert('تم الحذف بنجاح');

        // إعادة رندرة القسم المفتوح في لوحة التحكم
        const sectionMap = {
            'lessons': 'add-lesson',
            'exams': 'add-exam',
            'files': 'add-file'
        };
        renderAdminSection(sectionMap[collection]);

        // تحديث الموقع الأساسي إذا كان المستخدم يشاهد قسماً معيناً
        if (currentState.selectedGrade) renderContent();
    } catch (error) {
        console.error("Error deleting item:", error);
        alert('حدث خطأ أثناء الحذف، يرجى المحاولة مرة أخرى');
    }
}
async function toggleVoucherStatus(id, currentActive) {
    try {
        const newStatus = !currentActive;
        await db.collection('vouchers').doc(id).update({
            isActive: newStatus
        });

        // تحديث محلي
        const voucher = appData.vouchers.find(v => v.id === id);
        if (voucher) voucher.isActive = newStatus;

        alert(newStatus ? 'تم تفعيل الكود بنجاح' : 'تم إغلاق الكود بنجاح');
        renderAdminSection('vouchers');
    } catch (error) {
        console.error("Error toggling voucher status:", error);
        alert('حدث خطأ أثناء تعديل حالة الكود');
    }
}

async function updateVoucherNote(id, note) {
    try {
        await db.collection('vouchers').doc(id).update({
            note: note
        });

        // تحديث محلي
        const voucher = appData.vouchers.find(v => v.id === id);
        if (voucher) voucher.note = note;
    } catch (error) {
        console.error("Error updating voucher note:", error);
    }
}

// --- New Voucher UI Helpers ---
function renderVoucherRows(vouchers) {
    return vouchers.slice()
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
        .reverse()
        .map((v, idx, arr) => {
            const active = v.isActive !== false;
            const serial = arr.length - idx;
            const gradeTitle = appData.grades[v.grade]?.title ||
                (v.grade === '3sec' ? 'الثالث الثانوي' :
                    (v.grade === '3mid' ? 'الثالث الإعدادي' :
                        (v.grade === '1sec' ? 'الأول الثانوي' :
                            (v.grade === '2sec' ? 'الثاني الثانوي' : v.grade || 'غير محدد'))));

            return `
                <tr>
                    <td><span style="color: var(--text-muted); font-size: 0.8rem;">#${serial}</span></td>
                    <td style="font-family: monospace; font-size: 1.1rem; color: var(--primary-light);">${v.code}</td>
                    <td><span class="status-badge" style="background: rgba(99, 102, 241, 0.1); color: #6366f1;">${gradeTitle}</span></td>
                    <td>
                        <input type="text" class="voucher-note-input" 
                               value="${v.note || ''}" 
                               placeholder="اكتب اسم الطالب هنا..." 
                               onblur="updateVoucherNote('${v.id}', this.value)">
                    </td>
                    <td>
                        <span class="status-badge" style="background: ${v.isUsed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)'}; color: ${v.isUsed ? '#ef4444' : '#22c55e'};">
                            ${v.isUsed ? 'مُستخدم' : 'متاح'}
                        </span>
                        <span class="status-badge" style="background: ${active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color: ${active ? '#22c55e' : '#f59e0b'}; margin-right: 5px;">
                            ${active ? 'مفعل' : 'مغلق'}
                        </span>
                    </td>
                    <td>
                        <button class="btn-primary" style="background: ${active ? '#f59e0b' : '#22c55e'}; padding: 5px 10px;" onclick="toggleVoucherStatus('${v.id}', ${active})">
                            <i class="fas fa-${active ? 'pause' : 'play'}"></i> ${active ? 'إغلاق' : 'تفعيل'}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
}

function filterVouchersByGrade(grade) {
    const tbody = document.getElementById('vouchers-table-body');
    if (!tbody) return;

    const filtered = grade === 'all'
        ? appData.vouchers
        : appData.vouchers.filter(v => v.grade === grade);

    tbody.innerHTML = renderVoucherRows(filtered);
}

async function resetFullSystem() {
    const confirmation = confirm("⚠️ تحذير نهائي: هل أنت متأكد من حذف كافة البيانات (دروس، طلاب، اختبارات، أكواد، إلخ)؟ لا يمكن التراجع عن هذه الخطوة!");
    if (!confirmation) return;

    const secondConfirmation = prompt("لتأكيد الحذف، اكتب كلمة 'تصفير' في المربع أدناه:");
    if (secondConfirmation !== 'تصفير') {
        alert("إجراء ملغي: الكلمة غير صحيحة");
        return;
    }

    const collections = ['lessons', 'exams', 'files', 'vouchers', 'students', 'visits'];

    try {
        // Show loading state
        document.getElementById('admin-content-area').innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color: var(--primary-light);"></i>
                <h3 style="margin-top: 20px;">جاري تصفير النظام... برجاء عدم إغلاق الصفحة</h3>
            </div>
        `;

        for (const coll of collections) {
            const snapshot = await db.collection(coll).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();

        alert("تم تصفير النظام بنجاح! سيتم إعادة تحميل الصفحة الآن.");
        window.location.reload();

    } catch (error) {
        console.error("Error resetting system:", error);
        alert("حدث خطأ أثناء تصفير النظام. برجاء المحاولة مرة أخرى أو التواصل مع المبرمج.");
    }
}

// --- Contact Form Handling ---
function handleContactForm(event) {
    event.preventDefault();

    const name = document.getElementById('contact-name').value;
    const phone = document.getElementById('contact-phone').value;
    const message = document.getElementById('contact-message').value;

    const whatsappNumber = '201010034756'; // الاستاذ علي عبد الوهاب
    const text = `السلام عليكم أستاذ علي،\nانا الطالب: ${name}\nرقم هاتفي: ${phone}\nرسالتي: ${message}`;

    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');

    // Optional: Reset form
    event.target.reset();
}
