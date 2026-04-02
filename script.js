const STORAGE_KEY = 'studymate_users';
const CURRENT_KEY = 'studymate_current_user';

const defaultData = {
  subjects: [
    { id: 1, name: 'Lập trình Web', color: 'blue' },
    { id: 2, name: 'Backend', color: 'orange' },
    { id: 3, name: 'Testing', color: 'green' }
  ],
  tasks: [
    {
      id: 1,
      title: 'Thiết kế giao diện dashboard',
      subjectId: 1,
      deadline: getDateOffset(2),
      priority: 'Cao',
      status: 'Đang làm',
      description: 'Thiết kế dashboard chính cho StudyMate'
    },
    {
      id: 2,
      title: 'Viết chức năng đăng nhập',
      subjectId: 2,
      deadline: getDateOffset(4),
      priority: 'Trung bình',
      status: 'Chưa làm',
      description: 'Xử lý đăng nhập bằng localStorage'
    },
    {
      id: 3,
      title: 'Kiểm thử form đăng ký',
      subjectId: 3,
      deadline: getDateOffset(5),
      priority: 'Thấp',
      status: 'Hoàn thành',
      description: 'Test validate cơ bản cho form'
    }
  ]
};

function getDateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function $(id) {
  return document.getElementById(id);
}

function getSafeColor(color) {
  return color || 'blue';
}

function normalizeUserData(user) {
  if (!user) return null;

  user.subjects = (user.subjects || []).map(subject => ({
    ...subject,
    color: subject.color || 'blue'
  }));

  user.tasks = user.tasks || [];
  return user;
}

function showToast(message) {
  const toast = $('toast');
  if (!toast) {
    alert(message);
    return;
  }
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2200);
}

function readUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUserEmail() {
  return localStorage.getItem(CURRENT_KEY);
}

function setCurrentUserEmail(email) {
  localStorage.setItem(CURRENT_KEY, email);
}

function clearCurrentUser() {
  localStorage.removeItem(CURRENT_KEY);
}

function getCurrentUser() {
  const email = getCurrentUserEmail();
  if (!email) return null;

  const user = readUsers().find(user => user.email === email) || null;
  return normalizeUserData(user);
}

function updateCurrentUser(updatedUser) {
  const normalizedUser = normalizeUserData(updatedUser);

  const users = readUsers().map(user =>
    user.email === normalizedUser.email ? normalizedUser : user
  );
  saveUsers(users);
}

function ensureSeedUser() {
  const users = readUsers();
  if (users.length === 0) {
    users.push({
      name: 'Quyền',
      email: 'quyen@example.com',
      password: '123456',
      subjects: defaultData.subjects,
      tasks: defaultData.tasks
    });
    saveUsers(users);
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function getSubjectById(user, subjectId) {
  return user.subjects.find(subject => Number(subject.id) === Number(subjectId));
}

function calculateStats(user) {
  const total = user.tasks.length;
  const completed = user.tasks.filter(task => task.status === 'Hoàn thành').length;
  const inProgress = user.tasks.filter(task => task.status === 'Đang làm').length;
  const upcoming = user.tasks.filter(task => {
    if (!task.deadline || task.status === 'Hoàn thành') return false;
    const diff = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return { total, completed, inProgress, upcoming, percent };
}

function setAuthMode(mode) {
  const loginCard = $('loginCard');
  const registerCard = $('registerCard');
  if (!loginCard || !registerCard) return;

  loginCard.classList.toggle('hidden', mode !== 'login');
  registerCard.classList.toggle('hidden', mode !== 'register');
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  const target = $(viewId);
  if (target) target.classList.add('active');

  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });
}

function setAppState(loggedIn) {
  $('sidebar')?.classList.toggle('hidden', !loggedIn);
  $('logoutBtn')?.classList.toggle('hidden', !loggedIn);
  $('currentUserText')?.classList.toggle('hidden', !loggedIn);

  if (loggedIn) {
    showView('dashboardView');
    renderAll();
  } else {
    showView('authView');
    setAuthMode('login');
  }
}

function renderStatsCards(targetId) {
  const user = getCurrentUser();
  if (!user) return;

  const stats = calculateStats(user);
  const cards = [
    { label: 'Tổng bài tập', value: stats.total },
    { label: 'Đã hoàn thành', value: stats.completed },
    { label: 'Đang làm', value: stats.inProgress },
    { label: 'Sắp đến hạn', value: stats.upcoming }
  ];

  const target = $(targetId);
  if (!target) return;

  target.innerHTML = cards.map(card => `
    <div class="stat-card">
      <div class="small-text">${card.label}</div>
      <div class="value">${card.value}</div>
    </div>
  `).join('');
}

function renderDashboardTasks() {
  const user = getCurrentUser();
  if (!user || !$('dashboardTaskTable')) return;

  const sorted = [...user.tasks]
    .sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''))
    .slice(0, 5);

  $('dashboardTaskTable').innerHTML = sorted.length
    ? sorted.map(task => {
        const subject = getSubjectById(user, task.subjectId);
        return `
          <tr>
            <td>${task.title}</td>
            <td>${subject ? subject.name : ''}</td>
            <td>${formatDate(task.deadline)}</td>
            <td><span class="tag ${mapPriorityClass(task.priority)}">${task.priority}</span></td>
            <td><span class="tag ${mapStatusClass(task.status)}">${task.status}</span></td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="5">Chưa có bài tập nào.</td></tr>`;
}

function renderSubjectChips() {
  const user = getCurrentUser();
  const target = $('subjectChipList');
  if (!user || !target) return;

  target.innerHTML = user.subjects.length
    ? user.subjects
        .map(subject => `<div class="chip ${getSafeColor(subject.color)}">${subject.name}</div>`)
        .join('')
    : `<div>Chưa có môn học.</div>`;
}

function renderDeadlines() {
  const user = getCurrentUser();
  const target = $('deadlineList');
  if (!user || !target) return;

  const upcoming = [...user.tasks]
    .filter(task => task.status !== 'Hoàn thành' && task.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4);

  target.innerHTML = upcoming.length
    ? upcoming.map(task => {
        const subject = getSubjectById(user, task.subjectId);
        return `
          <div class="deadline-item ${mapPriorityClass(task.priority)}">
            <strong>${task.title}</strong><br>
            <span>${formatDate(task.deadline)} • ${subject ? subject.name : ''}</span>
          </div>
        `;
      }).join('')
    : `<div>Không có deadline gần.</div>`;
}

function renderSubjects() {
  const user = getCurrentUser();
  const target = $('subjectList');
  if (!user || !target) return;

  target.innerHTML = user.subjects.length
    ? user.subjects.map(subject => {
        const count = user.tasks.filter(task => Number(task.subjectId) === Number(subject.id)).length;
        const subjectColor = getSafeColor(subject.color);

        return `
          <div class="item-card">
            <div class="item-header">
              <div>
                <div class="tag ${subjectColor}">${subject.name}</div>
                <div class="small-text" style="margin-top:8px">${count} bài tập liên quan</div>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn btn-light" onclick="editSubject(${subject.id})">Sửa</button>
              <button class="btn btn-light" onclick="deleteSubject(${subject.id})">Xóa</button>
            </div>
          </div>
        `;
      }).join('')
    : `<div>Chưa có môn học nào.</div>`;

  updateSubjectSelect();
}

function renderTasks() {
  const user = getCurrentUser();
  const target = $('taskList');
  if (!user || !target) return;

  const keyword = $('searchTask') ? $('searchTask').value.trim().toLowerCase() : '';
  const filterStatus = $('filterStatus') ? $('filterStatus').value : '';

  const filtered = user.tasks.filter(task => {
    const matchesKeyword = task.title.toLowerCase().includes(keyword);
    const matchesStatus = !filterStatus || task.status === filterStatus;
    return matchesKeyword && matchesStatus;
  });

  target.innerHTML = filtered.length
    ? filtered.map(task => {
        const subject = getSubjectById(user, task.subjectId);
        return `
          <div class="item-card">
            <div class="item-header">
              <div>
                <h3>${task.title}</h3>
                <div class="item-meta">
                  <span class="tag ${subject ? getSafeColor(subject.color) : 'blue'}">${subject ? subject.name : 'Chưa chọn môn'}</span>
                  <span class="tag ${mapPriorityClass(task.priority)}">${task.priority}</span>
                  <span class="tag ${mapStatusClass(task.status)}">${task.status}</span>
                </div>
                <div class="small-text" style="margin-top:10px">Deadline: ${formatDate(task.deadline)}</div>
                ${task.description ? `<div class="small-text" style="margin-top:6px">${task.description}</div>` : ''}
              </div>
            </div>
            <div class="item-actions">
              <button class="btn btn-light" onclick="editTask(${task.id})">Sửa</button>
              <button class="btn btn-light" onclick="toggleTaskStatus(${task.id})">Đổi trạng thái</button>
              <button class="btn btn-light" onclick="deleteTask(${task.id})">Xóa</button>
            </div>
          </div>
        `;
      }).join('')
    : `<div>Không có bài tập phù hợp.</div>`;
}

function renderChart() {
  const user = getCurrentUser();
  const target = $('barChart');
  if (!user || !target) return;

  if (!user.subjects.length) {
    target.innerHTML = '<div>Chưa có dữ liệu môn học để thống kê.</div>';
    return;
  }

  target.innerHTML = user.subjects.map(subject => {
    const tasks = user.tasks.filter(task => Number(task.subjectId) === Number(subject.id));
    const total = tasks.length || 1;
    const done = tasks.filter(task => task.status === 'Hoàn thành').length;
    const percent = tasks.length ? Math.round((done / total) * 100) : 0;
    const height = Math.max(20, Math.round(percent * 2));

    return `
      <div class="bar-box">
        <div class="bar" style="height:${height}px"></div>
        <div><strong>${percent}%</strong></div>
        <div class="small-text">${subject.name}</div>
      </div>
    `;
  }).join('');
}

function mapPriorityClass(priority) {
  if (priority === 'Cao') return 'red';
  if (priority === 'Trung bình') return 'orange';
  return 'green';
}

function mapStatusClass(status) {
  if (status === 'Hoàn thành') return 'green';
  if (status === 'Đang làm') return 'gray';
  return 'blue';
}

function updateSubjectSelect() {
  const user = getCurrentUser();
  const select = $('taskSubject');
  if (!user || !select) return;

  if (!user.subjects.length) {
    select.innerHTML = '<option value="">Chưa có môn học</option>';
    return;
  }

  select.innerHTML = user.subjects
    .map(subject => `<option value="${subject.id}">${subject.name}</option>`)
    .join('');
}

function resetSubjectForm() {
  $('subjectForm')?.reset();
  if ($('subjectId')) $('subjectId').value = '';
  if ($('subjectFormTitle')) $('subjectFormTitle').textContent = 'Thêm môn học';
  $('cancelSubjectEdit')?.classList.add('hidden');
}

function resetTaskForm() {
  $('taskForm')?.reset();
  if ($('taskId')) $('taskId').value = '';
  if ($('taskFormTitle')) $('taskFormTitle').textContent = 'Thêm bài tập';
  $('cancelTaskEdit')?.classList.add('hidden');
  updateSubjectSelect();
}

function renderAll() {
  const user = getCurrentUser();
  if (!user) return;

  if ($('currentUserText')) $('currentUserText').textContent = user.name;
  if ($('welcomeText')) $('welcomeText').textContent = `Xin chào, ${user.name} 👋`;

  const stats = calculateStats(user);
  if ($('sidebarProgress')) $('sidebarProgress').textContent = `${stats.percent}%`;

  renderStatsCards('statsGrid');
  renderStatsCards('statsGridBottom');
  renderDashboardTasks();
  renderSubjectChips();
  renderDeadlines();
  renderSubjects();
  renderTasks();
  renderChart();
}

function handleRegister(event) {
  event.preventDefault();

  const name = $('registerName')?.value.trim();
  const email = $('registerEmail')?.value.trim().toLowerCase();
  const password = $('registerPassword')?.value;
  const confirm = $('registerConfirm')?.value;

  if (!name || !email || !password || !confirm) {
    showToast('Vui lòng nhập đầy đủ thông tin.');
    return;
  }

  if (password !== confirm) {
    showToast('Mật khẩu xác nhận không khớp.');
    return;
  }

  const users = readUsers();
  const exists = users.some(user => user.email === email);
  if (exists) {
    showToast('Email này đã tồn tại.');
    return;
  }

  users.push({
    name,
    email,
    password,
    subjects: [],
    tasks: []
  });

  saveUsers(users);
  $('registerForm')?.reset();
  setAuthMode('login');
  showToast('Đăng ký thành công. Hãy đăng nhập.');
}

function handleLogin(event) {
  event.preventDefault();

  const email = $('loginEmail')?.value.trim().toLowerCase();
  const password = $('loginPassword')?.value;

  const user = readUsers().find(item => item.email === email && item.password === password);
  if (!user) {
    showToast('Sai email hoặc mật khẩu.');
    return;
  }

  setCurrentUserEmail(user.email);
  setAppState(true);
  showToast('Đăng nhập thành công.');
}

function handleLogout() {
  clearCurrentUser();
  setAppState(false);
  showToast('Đã đăng xuất.');
}

function handleSubjectSubmit(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  const id = $('subjectId')?.value;
  const name = $('subjectName')?.value.trim();
  const color = $('subjectColor')?.value || 'blue';

  if (!name) {
    showToast('Tên môn học không được để trống.');
    return;
  }

  const duplicate = user.subjects.some(subject =>
    subject.name.toLowerCase() === name.toLowerCase() && String(subject.id) !== String(id)
  );

  if (duplicate) {
    showToast('Môn học đã tồn tại.');
    return;
  }

  if (id) {
    user.subjects = user.subjects.map(subject =>
      String(subject.id) === String(id) ? { ...subject, name, color } : subject
    );
    showToast('Đã cập nhật môn học.');
  } else {
    user.subjects.push({
      id: Date.now(),
      name,
      color
    });
    showToast('Đã thêm môn học.');
  }

  updateCurrentUser(user);
  resetSubjectForm();
  renderAll();
}

function editSubject(id) {
  const user = getCurrentUser();
  if (!user) return;

  const subject = user.subjects.find(item => Number(item.id) === Number(id));
  if (!subject) return;

  $('subjectId').value = subject.id;
  $('subjectName').value = subject.name;
  $('subjectColor').value = getSafeColor(subject.color);
  $('subjectFormTitle').textContent = 'Sửa môn học';
  $('cancelSubjectEdit').classList.remove('hidden');
  showView('subjectsView');
}

function deleteSubject(id) {
  const user = getCurrentUser();
  if (!user) return;

  const confirmDelete = window.confirm('Bạn có chắc muốn xóa môn học này không?');
  if (!confirmDelete) return;

  const hasTask = user.tasks.some(task => Number(task.subjectId) === Number(id));
  if (hasTask) {
    showToast('Không thể xóa môn học đang có bài tập.');
    return;
  }

  user.subjects = user.subjects.filter(subject => Number(subject.id) !== Number(id));
  updateCurrentUser(user);
  resetSubjectForm();
  renderAll();
  showToast('Đã xóa môn học.');
}

function handleTaskSubmit(event) {
  event.preventDefault();
  const user = getCurrentUser();
  if (!user) return;

  if (!user.subjects.length) {
    showToast('Hãy thêm ít nhất một môn học trước.');
    return;
  }

  const id = $('taskId')?.value;
  const task = {
    id: id ? Number(id) : Date.now(),
    title: $('taskTitle')?.value.trim(),
    subjectId: Number($('taskSubject')?.value),
    deadline: $('taskDeadline')?.value,
    priority: $('taskPriority')?.value,
    status: $('taskStatus')?.value,
    description: $('taskDescription')?.value.trim()
  };

  if (!task.title || !task.deadline || !task.subjectId) {
    showToast('Vui lòng nhập đầy đủ thông tin bài tập.');
    return;
  }

  if (id) {
    user.tasks = user.tasks.map(item => Number(item.id) === Number(id) ? task : item);
    showToast('Đã cập nhật bài tập.');
  } else {
    user.tasks.push(task);
    showToast('Đã thêm bài tập.');
  }

  updateCurrentUser(user);
  resetTaskForm();
  renderAll();
}

function editTask(id) {
  const user = getCurrentUser();
  if (!user) return;

  const task = user.tasks.find(item => Number(item.id) === Number(id));
  if (!task) return;

  $('taskId').value = task.id;
  $('taskTitle').value = task.title;
  $('taskSubject').value = task.subjectId;
  $('taskDeadline').value = task.deadline;
  $('taskPriority').value = task.priority;
  $('taskStatus').value = task.status;
  $('taskDescription').value = task.description || '';
  $('taskFormTitle').textContent = 'Sửa bài tập';
  $('cancelTaskEdit').classList.remove('hidden');
  showView('tasksView');
}

function deleteTask(id) {
  const user = getCurrentUser();
  if (!user) return;

  const confirmDelete = window.confirm('Bạn có chắc muốn xóa bài tập này không?');
  if (!confirmDelete) return;

  user.tasks = user.tasks.filter(task => Number(task.id) !== Number(id));
  updateCurrentUser(user);
  resetTaskForm();
  renderAll();
  showToast('Đã xóa bài tập.');
}

function toggleTaskStatus(id) {
  const user = getCurrentUser();
  if (!user) return;

  const order = ['Chưa làm', 'Đang làm', 'Hoàn thành'];
  user.tasks = user.tasks.map(task => {
    if (Number(task.id) !== Number(id)) return task;
    const currentIndex = order.indexOf(task.status);
    const nextStatus = order[(currentIndex + 1) % order.length];
    return { ...task, status: nextStatus };
  });

  updateCurrentUser(user);
  renderAll();
  showToast('Đã đổi trạng thái bài tập.');
}

function bindEvents() {
  $('goRegister')?.addEventListener('click', () => setAuthMode('register'));
  $('goLogin')?.addEventListener('click', () => setAuthMode('login'));

  $('registerForm')?.addEventListener('submit', handleRegister);
  $('loginForm')?.addEventListener('submit', handleLogin);
  $('logoutBtn')?.addEventListener('click', handleLogout);

  $('subjectForm')?.addEventListener('submit', handleSubjectSubmit);
  $('cancelSubjectEdit')?.addEventListener('click', resetSubjectForm);

  $('taskForm')?.addEventListener('submit', handleTaskSubmit);
  $('cancelTaskEdit')?.addEventListener('click', resetTaskForm);

  $('searchTask')?.addEventListener('input', renderTasks);
  $('filterStatus')?.addEventListener('change', renderTasks);

  document.querySelectorAll('.menu-item').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });

  $('quickAddSubjectBtn')?.addEventListener('click', () => showView('subjectsView'));
  $('quickAddTaskBtn')?.addEventListener('click', () => showView('tasksView'));
}

function boot() {
  ensureSeedUser();
  bindEvents();

  const current = getCurrentUser();
  if (current) {
    setAppState(true);
  } else {
    setAppState(false);
    setAuthMode('login');
  }
}

window.editSubject = editSubject;
window.deleteSubject = deleteSubject;
window.editTask = editTask;
window.deleteTask = deleteTask;
window.toggleTaskStatus = toggleTaskStatus;

boot();

window.addEventListener('load', () => {
  $('loginEmail')?.focus();
});
