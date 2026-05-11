// Global variable
var supabaseClient = null;

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
        loadRecords();
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

// Add work record
async function addRecord() {
    if (!supabaseClient) {
        showToast('请先配置 Supabase', 'error');
        return;
    }
    
    var startTime = document.getElementById('startTime').value;
    var endTime = document.getElementById('endTime').value;
    var note = document.getElementById('note').value;
    
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

// Display records
function displayRecords(records) {
    var container = document.getElementById('recordsList');
    
    if (records.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-400 py-8">暂无记录</div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < records.length; i++) {
        var record = records[i];
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
    loadRecords();
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
