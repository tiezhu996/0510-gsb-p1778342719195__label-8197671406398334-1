// Global variable
var supabaseClient = null;
var anchorsCache = [];

// Toast notification system
function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    
    var icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = '<span style="font-size: 18px;">' + icon + '</span><span>' + message + '</span>';
    container.appendChild(toast);
    
    setTimeout(function() {
        toast.classList.add('hiding');
        setTimeout(function() {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Toggle config panel
function toggleConfig() {
    var panel = document.getElementById('configPanel');
    var toggle = document.getElementById('configToggle');
    if (panel && toggle) {
        panel.classList.toggle('open');
        toggle.textContent = panel.classList.contains('open') ? '▲' : '▼';
    }
}

// Toggle anchor panel
function toggleAnchorPanel() {
    var panel = document.getElementById('anchorPanel');
    var toggle = document.getElementById('anchorToggle');
    if (panel && toggle) {
        panel.classList.toggle('open');
        toggle.textContent = panel.classList.contains('open') ? '▲' : '▼';
    }
}

// Load config from localStorage
function loadConfig() {
    var url = localStorage.getItem('supabaseUrl');
    var key = localStorage.getItem('supabaseKey');
    
    if (url && key) {
        var urlInput = document.getElementById('supabaseUrl');
        var keyInput = document.getElementById('supabaseKey');
        if (urlInput) urlInput.value = url;
        if (keyInput) keyInput.value = key;
        initSupabase(url, key);
    }
}

// Save config to localStorage
function saveConfig() {
    var url = document.getElementById('supabaseUrl').value.trim();
    var key = document.getElementById('supabaseKey').value.trim();
    
    if (!url || !key) {
        showToast('请填写完整的配置信息', 'error');
        return;
    }
    
    localStorage.setItem('supabaseUrl', url);
    localStorage.setItem('supabaseKey', key);
    
    initSupabase(url, key);
    showToast('配置保存成功！', 'success');
}

// Initialize Supabase client
function initSupabase(url, key) {
    try {
        supabaseClient = window.supabase.createClient(url, key);
        loadAnchors().then(function() {
            loadRecords();
        });
    } catch (error) {
        console.error('初始化 Supabase 失败:', error);
    }
}

// ============ Anchor Management ============

async function loadAnchors() {
    if (!supabaseClient) return;
    
    try {
        var response = await supabaseClient
            .from('anchors')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (response.error) {
            console.error('Error loading anchors:', response.error);
            return;
        }
        
        anchorsCache = response.data || [];
        displayAnchors(anchorsCache);
        updateAnchorSelect(anchorsCache);
    } catch (error) {
        console.error('加载主播失败:', error);
    }
}

function displayAnchors(anchors) {
    var container = document.getElementById('anchorList');
    
    if (anchors.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-2 w-full">暂无主播</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < anchors.length; i++) {
        var anchor = anchors[i];
        html += '<div class="anchor-tag flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full border border-purple-200">';
        html += '  <span class="text-sm font-medium text-purple-700">🎤 ' + anchor.name + '</span>';
        html += '  <button data-anchor-id="' + anchor.id + '" class="delete-anchor-btn text-red-400 hover:text-red-600 text-lg leading-none cursor-pointer">&times;</button>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function updateAnchorSelect(anchors) {
    var select = document.getElementById('anchorSelect');
    if (!select) return;
    
    var currentVal = select.value;
    var html = '<option value="">请选择主播</option>';
    for (var i = 0; i < anchors.length; i++) {
        var selected = anchors[i].id.toString() === currentVal ? ' selected' : '';
        html += '<option value="' + anchors[i].id + '"' + selected + '>' + anchors[i].name + '</option>';
    }
    select.innerHTML = html;
}

async function addAnchor() {
    if (!supabaseClient) {
        showToast('请先配置 Supabase', 'error');
        return;
    }
    
    var nameInput = document.getElementById('anchorNameInput');
    var name = nameInput.value.trim();
    
    if (!name) {
        showToast('请输入主播名称', 'error');
        return;
    }
    
    var response = await supabaseClient
        .from('anchors')
        .insert([{ name: name }])
        .select();
    
    if (response.error) {
        console.error('Error:', response.error);
        showToast('添加失败: ' + response.error.message, 'error');
        return;
    }
    
    nameInput.value = '';
    showToast('主播「' + name + '」添加成功！', 'success');
    loadAnchors();
}

async function deleteAnchor(id) {
    if (!confirm('确定要删除该主播吗？关联的工作记录将保留但不再显示主播。')) return;
    
    var response = await supabaseClient
        .from('anchors')
        .delete()
        .eq('id', id);
    
    if (response.error) {
        showToast('删除失败: ' + response.error.message, 'error');
        return;
    }
    
    showToast('主播删除成功', 'success');
    loadAnchors();
    loadRecords();
}

function getAnchorName(anchorId) {
    if (!anchorId) return '未指定';
    for (var i = 0; i < anchorsCache.length; i++) {
        if (anchorsCache[i].id === anchorId) return anchorsCache[i].name;
    }
    return '未知主播';
}

// ============ Salary Calculation ============

function calculateSalary(startTime, endTime) {
    var start = new Date(startTime);
    var end = new Date(endTime);
    
    var totalSalary = 0;
    var totalHours = 0;
    
    var current = new Date(start);
    
    while (current < end) {
        var nextHour = new Date(current);
        nextHour.setHours(current.getHours() + 1);
        
        var segmentEnd = nextHour > end ? end : nextHour;
        var hours = (segmentEnd - current) / (1000 * 60 * 60);
        
        var hour = current.getHours();
        
        var rate = 40;
        if (hour >= 6 && hour < 8) {
            rate = 50;
        } else if (hour >= 22 && hour < 24) {
            rate = 50;
        }
        
        totalSalary += hours * rate;
        totalHours += hours;
        
        current = nextHour;
    }
    
    return {
        totalHours: totalHours.toFixed(2),
        totalSalary: totalSalary.toFixed(2)
    };
}

// ============ Work Records ============

async function addRecord() {
    if (!supabaseClient) {
        showToast('请先配置 Supabase', 'error');
        return;
    }
    
    var anchorId = document.getElementById('anchorSelect').value;
    var startTime = document.getElementById('startTime').value;
    var endTime = document.getElementById('endTime').value;
    var note = document.getElementById('note').value;
    
    if (!anchorId) {
        showToast('请选择主播', 'error');
        return;
    }
    
    if (!startTime || !endTime) {
        showToast('请填写开始和结束时间', 'error');
        return;
    }
    
    if (new Date(startTime) >= new Date(endTime)) {
        showToast('结束时间必须晚于开始时间', 'error');
        return;
    }
    
    var result = calculateSalary(startTime, endTime);
    
    var record = {
        anchor_id: parseInt(anchorId),
        start_time: startTime,
        end_time: endTime,
        total_hours: parseFloat(result.totalHours),
        total_salary: parseFloat(result.totalSalary),
        note: note || null
    };
    
    var response = await supabaseClient
        .from('work_records')
        .insert([record])
        .select();
    
    if (response.error) {
        console.error('Error:', response.error);
        showToast('添加失败: ' + response.error.message, 'error');
        return;
    }
    
    document.getElementById('anchorSelect').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('note').value = '';
    
    showToast('添加成功！工作 ' + result.totalHours + ' 小时，工资 ¥' + result.totalSalary, 'success');
    loadRecords();
}

async function loadRecords() {
    if (!supabaseClient) return;
    
    try {
        var response = await supabaseClient
            .from('work_records')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (response.error) {
            console.error('Error loading records:', response.error);
            return;
        }
        
        displayRecords(response.data || []);
        updateStatistics(response.data || []);
        updateAnchorStatistics(response.data || []);
    } catch (error) {
        console.error('加载记录失败:', error);
    }
}

function displayRecords(records) {
    var container = document.getElementById('recordsList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">暂无记录</div>';
        return;
    }
    
    var grouped = {};
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var key = r.anchor_id || 'unassigned';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    }
    
    var html = '';
    var anchorIds = Object.keys(grouped);
    
    for (var a = 0; a < anchorIds.length; a++) {
        var anchorKey = anchorIds[a];
        var anchorId = anchorKey === 'unassigned' ? null : parseInt(anchorKey);
        var anchorName = getAnchorName(anchorId);
        var groupRecords = grouped[anchorKey];
        
        var groupSalary = 0;
        var groupHours = 0;
        for (var g = 0; g < groupRecords.length; g++) {
            groupSalary += parseFloat(groupRecords[g].total_salary);
            groupHours += parseFloat(groupRecords[g].total_hours);
        }
        
        html += '<div class="anchor-group mb-4">';
        html += '  <div class="anchor-group-header flex items-center justify-between p-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg mb-2">';
        html += '    <span class="text-white font-semibold">🎤 ' + anchorName + '</span>';
        html += '    <span class="text-white/80 text-sm">共 ' + groupHours.toFixed(2) + ' 小时 | ¥' + groupSalary.toFixed(2) + '</span>';
        html += '  </div>';
        html += '  <div class="space-y-2 pl-2">';
        
        for (var j = 0; j < groupRecords.length; j++) {
            var record = groupRecords[j];
            html += '<div class="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 hover:shadow-md transition-shadow">';
            html += '  <div class="flex justify-between items-start">';
            html += '    <div class="flex-1">';
            html += '      <div class="flex items-center gap-2 mb-2">';
            html += '        <span class="text-sm font-medium text-purple-600">';
            html += formatDateTime(record.start_time) + ' → ' + formatDateTime(record.end_time);
            html += '        </span>';
            html += '      </div>';
            html += '      <div class="text-sm text-gray-600">';
            html += '        工作时长: <span class="font-semibold">' + record.total_hours + ' 小时</span> | ';
            html += '        工资: <span class="font-semibold text-green-600">¥' + record.total_salary + '</span>';
            if (record.note) html += ' | 备注: ' + record.note;
            html += '      </div>';
            html += '    </div>';
            html += '    <button data-id="' + record.id + '" ';
            html += '            class="delete-btn btn px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">';
            html += '      删除';
            html += '    </button>';
            html += '  </div>';
            html += '</div>';
        }
        
        html += '  </div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
}

async function deleteRecord(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    var response = await supabaseClient
        .from('work_records')
        .delete()
        .eq('id', id);
    
    if (response.error) {
        showToast('删除失败: ' + response.error.message, 'error');
        return;
    }
    
    showToast('删除成功', 'success');
    loadRecords();
}

// Update global statistics (total across all anchors)
function updateStatistics(records) {
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    var todayTotal = 0;
    var weekTotal = 0;
    var monthTotal = 0;
    
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var createdAt = new Date(r.created_at);
        var salary = parseFloat(r.total_salary);
        
        if (createdAt >= today) todayTotal += salary;
        if (createdAt >= weekStart) weekTotal += salary;
        if (createdAt >= monthStart) monthTotal += salary;
    }
    
    var todayEl = document.getElementById('todayIncome');
    var weekEl = document.getElementById('weekIncome');
    var monthEl = document.getElementById('monthIncome');
    
    if (todayEl) todayEl.textContent = '¥' + todayTotal.toFixed(2);
    if (weekEl) weekEl.textContent = '¥' + weekTotal.toFixed(2);
    if (monthEl) monthEl.textContent = '¥' + monthTotal.toFixed(2);
}

// Update per-anchor statistics
function updateAnchorStatistics(records) {
    var container = document.getElementById('anchorStatsList');
    if (!container) return;
    
    if (records.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-4">暂无数据</div>';
        return;
    }
    
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    var anchorStats = {};
    for (var i = 0; i < records.length; i++) {
        var r = records[i];
        var key = r.anchor_id || 'unassigned';
        if (!anchorStats[key]) {
            anchorStats[key] = { today: 0, week: 0, month: 0, total: 0, totalHours: 0 };
        }
        var createdAt = new Date(r.created_at);
        var salary = parseFloat(r.total_salary);
        var hours = parseFloat(r.total_hours);
        
        anchorStats[key].total += salary;
        anchorStats[key].totalHours += hours;
        if (createdAt >= today) anchorStats[key].today += salary;
        if (createdAt >= weekStart) anchorStats[key].week += salary;
        if (createdAt >= monthStart) anchorStats[key].month += salary;
    }
    
    var html = '';
    var keys = Object.keys(anchorStats);
    
    for (var k = 0; k < keys.length; k++) {
        var anchorKey = keys[k];
        var anchorId = anchorKey === 'unassigned' ? null : parseInt(anchorKey);
        var anchorName = getAnchorName(anchorId);
        var stats = anchorStats[anchorKey];
        
        html += '<div class="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">';
        html += '  <div class="flex items-center justify-between mb-3">';
        html += '    <span class="font-semibold text-purple-700">🎤 ' + anchorName + '</span>';
        html += '    <span class="text-sm text-gray-500">累计 ' + stats.totalHours.toFixed(2) + ' 小时</span>';
        html += '  </div>';
        html += '  <div class="grid grid-cols-3 gap-3">';
        html += '    <div class="text-center p-2 bg-white/70 rounded-lg">';
        html += '      <div class="text-xs text-gray-500 mb-1">今日</div>';
        html += '      <div class="font-semibold text-green-600">¥' + stats.today.toFixed(2) + '</div>';
        html += '    </div>';
        html += '    <div class="text-center p-2 bg-white/70 rounded-lg">';
        html += '      <div class="text-xs text-gray-500 mb-1">本周</div>';
        html += '      <div class="font-semibold text-green-600">¥' + stats.week.toFixed(2) + '</div>';
        html += '    </div>';
        html += '    <div class="text-center p-2 bg-white/70 rounded-lg">';
        html += '      <div class="text-xs text-gray-500 mb-1">本月</div>';
        html += '      <div class="font-semibold text-green-600">¥' + stats.month.toFixed(2) + '</div>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    
    container.innerHTML = html;
}

// Format date time
function formatDateTime(dateStr) {
    var date = new Date(dateStr);
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return month + '-' + day + ' ' + hours + ':' + minutes;
}

// Initialize when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

function initApp() {
    loadConfig();
    setupEventListeners();
}

function setupEventListeners() {
    var toggleBtn = document.getElementById('toggleConfigBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleConfig);
    }

    var saveBtn = document.getElementById('saveConfigBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveConfig);
    }

    var toggleAnchorBtn = document.getElementById('toggleAnchorBtn');
    if (toggleAnchorBtn) {
        toggleAnchorBtn.addEventListener('click', toggleAnchorPanel);
    }

    var addAnchorBtn = document.getElementById('addAnchorBtn');
    if (addAnchorBtn) {
        addAnchorBtn.addEventListener('click', addAnchor);
    }

    var anchorNameInput = document.getElementById('anchorNameInput');
    if (anchorNameInput) {
        anchorNameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addAnchor();
            }
        });
    }

    var anchorListEl = document.getElementById('anchorList');
    if (anchorListEl) {
        anchorListEl.addEventListener('click', function(e) {
            var deleteBtn = e.target.closest('.delete-anchor-btn');
            if (deleteBtn) {
                var id = deleteBtn.getAttribute('data-anchor-id');
                if (id) {
                    deleteAnchor(id);
                }
            }
        });
    }

    var addRecordBtn = document.getElementById('addRecordBtn');
    if (addRecordBtn) {
        addRecordBtn.addEventListener('click', addRecord);
    }

    var recordsList = document.getElementById('recordsList');
    if (recordsList) {
        recordsList.addEventListener('click', function(e) {
            var deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                var id = deleteBtn.getAttribute('data-id');
                if (id) {
                    deleteRecord(id);
                }
            }
        });
    }
}
