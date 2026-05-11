// Global variables
var supabaseClient = null;
var streamers = [];

// Toast notification system
function showToast(message, type) {
    var container = document.getElementById('toastContainer');
    var toast = document.createElement('div');
    toast.className = 'toast ' + (type || 'info');
    
    // Add icon based on type
    var icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = '<span style="font-size: 18px;">' + icon + '</span><span>' + message + '</span>';
    container.appendChild(toast);
    
    // Auto dismiss after 3 seconds
    setTimeout(function() {
        toast.classList.add('hiding');
        setTimeout(function() {
            container.removeChild(toast);
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
        loadStreamers();
    } catch (error) {
        console.error('初始化 Supabase 失败:', error);
    }
}

// Calculate salary based on time segments
function calculateSalary(startTime, endTime) {
    var start = new Date(startTime);
    var end = new Date(endTime);
    
    var totalSalary = 0;
    var totalHours = 0;
    
    // Iterate through each hour
    var current = new Date(start);
    
    while (current < end) {
        var nextHour = new Date(current);
        nextHour.setHours(current.getHours() + 1);
        
        var segmentEnd = nextHour > end ? end : nextHour;
        var hours = (segmentEnd - current) / (1000 * 60 * 60);
        
        var hour = current.getHours();
        
        // Determine rate based on hour
        var rate = 40; // Default rate
        if (hour >= 6 && hour < 8) {
            rate = 50; // Early morning premium
        } else if (hour >= 22 && hour < 24) {
            rate = 50; // Late night premium
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

// Get streamer name by id
function getStreamerName(streamerId) {
    var streamer = streamers.find(function(s) { return s.id === streamerId; });
    return streamer ? streamer.name : '未知主播';
}

// Load streamers
async function loadStreamers() {
    if (!supabaseClient) return;
    
    try {
        var response = await supabaseClient
            .from('streamers')
            .select('*')
            .order('created_at', { ascending: true });
        
        if (response.error) {
            console.error('Error loading streamers:', response.error);
            return;
        }
        
        streamers = response.data || [];
        displayStreamers();
        populateStreamerSelect();
        loadRecords();
    } catch (error) {
        console.error('加载主播失败:', error);
    }
}

// Display streamers
function displayStreamers() {
    var container = document.getElementById('streamerList');
    
    if (streamers.length === 0) {
        container.innerHTML = '<div class="text-gray-400 text-sm py-2">暂无主播，请先添加</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < streamers.length; i++) {
        var streamer = streamers[i];
        html += '<div class="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg border border-purple-200">';
        html += '  <span class="font-medium text-purple-700">' + streamer.name + '</span>';
        html += '  <span class="text-purple-300 text-xs" title="为保护历史数据，主播不可删除">🔒</span>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// Populate streamer select dropdown
function populateStreamerSelect() {
    var select = document.getElementById('streamerSelect');
    if (!select) return;
    
    var html = '<option value="">-- 请选择主播 --</option>';
    for (var i = 0; i < streamers.length; i++) {
        var streamer = streamers[i];
        html += '<option value="' + streamer.id + '">' + streamer.name + '</option>';
    }
    select.innerHTML = html;
}

// Add streamer
async function addStreamer() {
    if (!supabaseClient) {
        showToast('请先配置 Supabase', 'error');
        return;
    }
    
    var nameInput = document.getElementById('streamerName');
    var name = nameInput.value.trim();
    
    if (!name) {
        showToast('请输入主播名称', 'error');
        return;
    }
    
    var response = await supabaseClient
        .from('streamers')
        .insert([{ name: name }])
        .select();
    
    if (response.error) {
        console.error('Error:', response.error);
        showToast('添加失败: ' + response.error.message, 'error');
        return;
    }
    
    nameInput.value = '';
    showToast('主播添加成功！', 'success');
    loadStreamers();
}

// Delete streamer - disabled with clear explanation
async function deleteStreamer(streamerId) {
    showToast('为保护历史数据，主播删除功能已禁用。主播相关的工作记录需要保留用于工资统计和历史查询。', 'info');
}

// Add work record
async function addRecord() {
    if (!supabaseClient) {
        showToast('请先配置 Supabase', 'error');
        return;
    }
    
    var streamerId = document.getElementById('streamerSelect').value;
    var startTime = document.getElementById('startTime').value;
    var endTime = document.getElementById('endTime').value;
    var note = document.getElementById('note').value;
    
    if (!streamerId) {
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
    
    var response = await supabaseClient
        .from('work_records')
        .insert([
            {
                streamer_id: parseInt(streamerId),
                start_time: startTime,
                end_time: endTime,
                total_hours: parseFloat(result.totalHours),
                total_salary: parseFloat(result.totalSalary),
                note: note || null
            }
        ])
        .select();
    
    if (response.error) {
        console.error('Error:', response.error);
        showToast('添加失败: ' + response.error.message, 'error');
        return;
    }
    
    // Clear form
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('note').value = '';
    document.getElementById('streamerSelect').value = '';
    
    showToast('添加成功！工作 ' + result.totalHours + ' 小时，工资 ¥' + result.totalSalary, 'success');
    loadRecords();
}

// Load all records
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
    } catch (error) {
        console.error('加载记录失败:', error);
    }
}

// Display records grouped by streamer
function displayRecords(records) {
    var container = document.getElementById('recordsList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">暂无记录</div>';
        return;
    }
    
    var grouped = {};
    for (var i = 0; i < records.length; i++) {
        var record = records[i];
        var key = record.streamer_id || 'unknown';
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(record);
    }
    
    var html = '';
    var streamerIds = Object.keys(grouped);
    for (var j = 0; j < streamerIds.length; j++) {
        var streamerId = streamerIds[j] === 'unknown' ? null : parseInt(streamerIds[j]);
        var streamerRecords = grouped[streamerIds[j]];
        var streamerName = streamerId ? getStreamerName(streamerId) : '未分配';
        
        html += '<div class="mb-6">';
        html += '  <h3 class="text-lg font-semibold text-purple-600 mb-3 pb-2 border-b-2 border-purple-200">';
        html += '    👤 ' + streamerName + ' <span class="text-sm text-gray-500 font-normal">(' + streamerRecords.length + ' 条记录)</span>';
        html += '  </h3>';
        html += '  <div class="space-y-3">';
        
        for (var k = 0; k < streamerRecords.length; k++) {
            var record = streamerRecords[k];
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

// Delete record
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

// Update statistics
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
    
    updateStreamerStatistics(records);
}

// Update per-streamer statistics
function updateStreamerStatistics(records) {
    var container = document.getElementById('streamerStats');
    if (!container) return;
    
    if (streamers.length === 0 || records.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-4">暂无数据</div>';
        return;
    }
    
    var stats = {};
    for (var i = 0; i < streamers.length; i++) {
        var s = streamers[i];
        stats[s.id] = {
            name: s.name,
            today: 0,
            week: 0,
            month: 0,
            total: 0
        };
    }
    
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (var j = 0; j < records.length; j++) {
        var r = records[j];
        if (!r.streamer_id || !stats[r.streamer_id]) continue;
        
        var createdAt = new Date(r.created_at);
        var salary = parseFloat(r.total_salary);
        
        stats[r.streamer_id].total += salary;
        if (createdAt >= today) stats[r.streamer_id].today += salary;
        if (createdAt >= weekStart) stats[r.streamer_id].week += salary;
        if (createdAt >= monthStart) stats[r.streamer_id].month += salary;
    }
    
    var html = '';
    var streamerIds = Object.keys(stats);
    for (var k = 0; k < streamerIds.length; k++) {
        var stat = stats[streamerIds[k]];
        html += '<div class="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100">';
        html += '  <div class="flex justify-between items-center">';
        html += '    <span class="font-semibold text-purple-700">👤 ' + stat.name + '</span>';
        html += '    <span class="text-lg font-bold text-green-600">总计: ¥' + stat.total.toFixed(2) + '</span>';
        html += '  </div>';
        html += '  <div class="grid grid-cols-3 gap-4 mt-2 text-sm text-gray-600">';
        html += '    <div>今日: <span class="font-semibold text-purple-600">¥' + stat.today.toFixed(2) + '</span></div>';
        html += '    <div>本周: <span class="font-semibold text-purple-600">¥' + stat.week.toFixed(2) + '</span></div>';
        html += '    <div>本月: <span class="font-semibold text-purple-600">¥' + stat.month.toFixed(2) + '</span></div>';
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
    // Config Toggle
    var toggleBtn = document.getElementById('toggleConfigBtn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleConfig);
    }

    // Save Config
    var saveBtn = document.getElementById('saveConfigBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveConfig);
    }

    // Add Streamer
    var addStreamerBtn = document.getElementById('addStreamerBtn');
    if (addStreamerBtn) {
        addStreamerBtn.addEventListener('click', addStreamer);
    }
    
    // Click on locked icon shows explanation
    var streamerList = document.getElementById('streamerList');
    if (streamerList) {
        streamerList.addEventListener('click', function(e) {
            var lockedIcon = e.target.closest('[title*="不可删除"]');
            if (lockedIcon) {
                deleteStreamer(null);
            }
        });
    }

    // Add Record
    var addBtn = document.getElementById('addRecordBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addRecord);
    }

    // Event Delegation for Delete (since records are dynamic)
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
