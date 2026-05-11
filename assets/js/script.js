var supabaseClient = null;
var streamers = [];

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
            container.removeChild(toast);
        }, 300);
    }, 3000);
}

function toggleConfig() {
    var panel = document.getElementById('configPanel');
    var toggle = document.getElementById('configToggle');
    if (panel && toggle) {
        panel.classList.toggle('open');
        toggle.textContent = panel.classList.contains('open') ? '▲' : '▼';
    }
}

function toggleStreamerPanel() {
    var panel = document.getElementById('streamerPanel');
    var toggle = document.getElementById('streamerToggle');
    if (panel && toggle) {
        panel.classList.toggle('open');
        toggle.textContent = panel.classList.contains('open') ? '▲' : '▼';
    }
}

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

async function initSupabase(url, key) {
    try {
        supabaseClient = window.supabase.createClient(url, key);
        await loadStreamers();
        loadRecords();
    } catch (error) {
        console.error('初始化 Supabase 失败:', error);
    }
}

async function addStreamer() {
    if (!supabaseClient) {
        showToast('请先配置 Supabase', 'error');
        return;
    }
    
    var name = document.getElementById('streamerName').value.trim();
    var color = document.getElementById('streamerColor').value;
    
    if (!name) {
        showToast('请输入主播名称', 'error');
        return;
    }
    
    var response = await supabaseClient
        .from('streamers')
        .insert([{ name: name, color: color }])
        .select();
    
    if (response.error) {
        showToast('添加失败: ' + response.error.message, 'error');
        return;
    }
    
    document.getElementById('streamerName').value = '';
    showToast('主播添加成功！', 'success');
    loadStreamers();
}

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
        updateStreamerSelect();
    } catch (error) {
        console.error('加载主播失败:', error);
    }
}

function displayStreamers() {
    var container = document.getElementById('streamersList');
    
    if (streamers.length === 0) {
        container.innerHTML = '<div class="text-gray-400 text-sm">暂无主播，请添加</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < streamers.length; i++) {
        var s = streamers[i];
        html += '<div class="flex items-center gap-2 px-3 py-2 rounded-full text-white text-sm" style="background: ' + s.color + '">';
        html += '  <span>' + s.name + '</span>';
        html += '  <button data-streamer-id="' + s.id + '" class="delete-streamer hover:bg-white/20 rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function updateStreamerSelect() {
    var select = document.getElementById('streamerSelect');
    if (!select) return;
    
    if (streamers.length === 0) {
        select.innerHTML = '<option value="">请先添加主播</option>';
        return;
    }
    
    var html = '<option value="">选择主播</option>';
    for (var i = 0; i < streamers.length; i++) {
        var s = streamers[i];
        html += '<option value="' + s.id + '">' + s.name + '</option>';
    }
    select.innerHTML = html;
}

async function deleteStreamer(id) {
    if (!confirm('确定要删除这个主播吗？相关的工作记录也会被删除。')) return;
    
    var response = await supabaseClient
        .from('streamers')
        .delete()
        .eq('id', id);
    
    if (response.error) {
        showToast('删除失败: ' + response.error.message, 'error');
        return;
    }
    
    showToast('删除成功', 'success');
    loadStreamers();
    loadRecords();
}

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
    
    document.getElementById('streamerSelect').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    document.getElementById('note').value = '';
    
    var streamer = streamers.find(function(s) { return s.id === parseInt(streamerId); });
    showToast('添加成功！' + (streamer ? streamer.name : '') + ' 工作 ' + result.totalHours + ' 小时，工资 ¥' + result.totalSalary, 'success');
    loadRecords();
}

async function loadRecords() {
    if (!supabaseClient) return;
    
    try {
        var response = await supabaseClient
            .from('work_records')
            .select('*, streamers(id, name, color)')
            .order('created_at', { ascending: false });
        
        if (response.error) {
            console.error('Error loading records:', response.error);
            return;
        }
        
        displayRecords(response.data || []);
        updateStatistics(response.data || []);
        updateStreamerStatistics(response.data || []);
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
        var streamerId = r.streamer_id || 'unknown';
        if (!grouped[streamerId]) {
            grouped[streamerId] = {
                streamer: r.streamers,
                records: []
            };
        }
        grouped[streamerId].records.push(r);
    }
    
    var html = '';
    var groupKeys = Object.keys(grouped);
    for (var g = 0; g < groupKeys.length; g++) {
        var group = grouped[groupKeys[g]];
        var streamer = group.streamer || { name: '未分配', color: '#9ca3af' };
        var streamerColor = streamer.color || '#9ca3af';
        
        var totalSalary = 0;
        var totalHours = 0;
        for (var j = 0; j < group.records.length; j++) {
            totalSalary += parseFloat(group.records[j].total_salary);
            totalHours += parseFloat(group.records[j].total_hours);
        }
        
        html += '<div class="mb-6">';
        html += '  <div class="flex items-center gap-3 mb-3">';
        html += '    <div class="w-4 h-4 rounded-full" style="background: ' + streamerColor + '"></div>';
        html += '    <h3 class="text-lg font-semibold text-gray-800">' + streamer.name + '</h3>';
        html += '    <span class="text-sm text-gray-500">共 ' + group.records.length + ' 条记录 | 总计 ' + totalHours.toFixed(2) + ' 小时 | ¥' + totalSalary.toFixed(2) + '</span>';
        html += '  </div>';
        html += '  <div class="space-y-3">';
        
        for (var k = 0; k < group.records.length; k++) {
            var record = group.records[k];
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

function updateStreamerStatistics(records) {
    var container = document.getElementById('streamerStats');
    if (!container) return;
    
    if (records.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-4 col-span-full">暂无数据</div>';
        return;
    }
    
    var streamerStats = {};
    
    for (var i = 0; i < streamers.length; i++) {
        streamerStats[streamers[i].id] = {
            streamer: streamers[i],
            today: 0,
            week: 0,
            month: 0,
            total: 0
        };
    }
    
    for (var j = 0; j < records.length; j++) {
        var r = records[j];
        var sid = r.streamer_id;
        if (!sid) continue;
        
        if (!streamerStats[sid] && r.streamers) {
            streamerStats[sid] = {
                streamer: r.streamers,
                today: 0,
                week: 0,
                month: 0,
                total: 0
            };
        }
    }
    
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    for (var k = 0; k < records.length; k++) {
        var record = records[k];
        var recordSid = record.streamer_id;
        if (!recordSid || !streamerStats[recordSid]) continue;
        
        var createdAt = new Date(record.created_at);
        var salary = parseFloat(record.total_salary);
        
        streamerStats[recordSid].total += salary;
        if (createdAt >= today) streamerStats[recordSid].today += salary;
        if (createdAt >= weekStart) streamerStats[recordSid].week += salary;
        if (createdAt >= monthStart) streamerStats[recordSid].month += salary;
    }
    
    var html = '';
    var statKeys = Object.keys(streamerStats);
    for (var m = 0; m < statKeys.length; m++) {
        var stat = streamerStats[statKeys[m]];
        var streamerColor = stat.streamer.color || '#667eea';
        html += '<div class="p-4 rounded-lg" style="background: ' + streamerColor + '20; border-left: 4px solid ' + streamerColor + '">';
        html += '  <div class="font-semibold text-gray-800 mb-2">' + stat.streamer.name + '</div>';
        html += '  <div class="grid grid-cols-2 gap-2 text-sm">';
        html += '    <div><span class="text-gray-500">今日:</span> <span class="font-medium">¥' + stat.today.toFixed(2) + '</span></div>';
        html += '    <div><span class="text-gray-500">本周:</span> <span class="font-medium">¥' + stat.week.toFixed(2) + '</span></div>';
        html += '    <div><span class="text-gray-500">本月:</span> <span class="font-medium">¥' + stat.month.toFixed(2) + '</span></div>';
        html += '    <div><span class="text-gray-500">总计:</span> <span class="font-medium text-green-600">¥' + stat.total.toFixed(2) + '</span></div>';
        html += '  </div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function formatDateTime(dateStr) {
    var date = new Date(dateStr);
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return month + '-' + day + ' ' + hours + ':' + minutes;
}

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

    var toggleStreamerBtn = document.getElementById('toggleStreamerBtn');
    if (toggleStreamerBtn) {
        toggleStreamerBtn.addEventListener('click', toggleStreamerPanel);
    }

    var addStreamerBtn = document.getElementById('addStreamerBtn');
    if (addStreamerBtn) {
        addStreamerBtn.addEventListener('click', addStreamer);
    }

    var addBtn = document.getElementById('addRecordBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addRecord);
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

    var streamersList = document.getElementById('streamersList');
    if (streamersList) {
        streamersList.addEventListener('click', function(e) {
            var deleteBtn = e.target.closest('.delete-streamer');
            if (deleteBtn) {
                var id = deleteBtn.getAttribute('data-streamer-id');
                if (id) {
                    deleteStreamer(id);
                }
            }
        });
    }
}
