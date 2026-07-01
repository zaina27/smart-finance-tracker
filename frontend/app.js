// ── Page navigation ──
function showPage(pageName, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
  document.getElementById('page-' + pageName).classList.add('active')
  btn.classList.add('active')
  if (pageName === 'records') loadRecords()
}

// ── File input display ──
document.getElementById('imageUpload').addEventListener('change', function() {
  const file = this.files[0]
  if (file) {
    document.getElementById('file-name-text').textContent = '📎 ' + file.name
    document.getElementById('file-name-display').style.display = 'block'

    const reader = new FileReader()
    reader.onload = function(e) {
      document.getElementById('image-preview').src = e.target.result
      document.getElementById('image-preview').style.display = 'block'
      document.getElementById('upload-placeholder').style.display = 'none'
    }
    reader.readAsDataURL(file)
  }
})

// ── Analyse image ──
document.getElementById('analyseBtn').addEventListener('click', async () => {
  const imageUpload = document.getElementById('imageUpload')

  if (!imageUpload.files[0]) {
    alert('Please select an image first!')
    return
  }

  const resultSection = document.getElementById('result-section')
  const resultText = document.getElementById('result-text')
  const categorizedBox = document.getElementById('categorized-box')
  const analyseBtn = document.getElementById('analyseBtn')

  resultSection.style.display = 'block'
  resultText.textContent = 'Analysing image... please wait ⏳'
  categorizedBox.style.display = 'none'
  analyseBtn.textContent = '⏳ Analysing...'
  analyseBtn.disabled = true

  const formData = new FormData()
  formData.append('image', imageUpload.files[0])

  try {
    const response = await fetch('http://127.0.0.1:5000/ocr', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    resultText.textContent = data.text

    if (data.categorized) {
      document.getElementById('cat-vendor').textContent = data.categorized.vendor || '-'
      document.getElementById('cat-date').textContent = data.categorized.date || '-'
      document.getElementById('cat-total').textContent = data.categorized.total || '-'
      document.getElementById('cat-category').textContent = data.categorized.category || '-'
      categorizedBox.style.display = 'block'
    }

    loadDashboard()

  } catch (error) {
    resultText.textContent = 'Something went wrong. Is the server running?'
  } finally {
    analyseBtn.textContent = '🔍 Analyse Image'
    analyseBtn.disabled = false
  }
})

// ── Load dashboard ──
async function loadDashboard() {
  try {
    const response = await fetch('http://127.0.0.1:5000/records')
    const records = await response.json()

    document.getElementById('total-records').textContent = records.length

    const categorized = records.filter(r => r.status === 'categorized')
    // document.getElementById('categorized-count').textContent = categorized.length

    let total = 0
    records.forEach(r => {
      if (r.total) {
        const amount = parseFloat(r.total.toString().replace(/[^0-9.]/g, ''))
        if (!isNaN(amount)) total += amount
      }
    })
    document.getElementById('total-spending').textContent = '$' + total.toFixed(2)

    const categories = {}
    records.forEach(r => {
      if (r.category && r.category !== 'Uncategorized') {
        const amount = parseFloat(r.total ? r.total.toString().replace(/[^0-9.]/g, '') : 0)
        categories[r.category] = (categories[r.category] || 0) + (isNaN(amount) ? 0 : amount)
      }
    })

    const top = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]
    document.getElementById('top-category').textContent = top ? top[0] : '-'

    // Monthly spending chart
    const monthly = {}
    records.forEach(r => {
      if (r.date && r.total) {
        const amount = parseFloat(r.total.toString().replace(/[^0-9.]/g, ''))
        if (!isNaN(amount)) {
          let monthKey = 'Unknown'
          const parsed = new Date(r.date)
          if (!isNaN(parsed)) {
            monthKey = parsed.toLocaleString('default', { month: 'short', year: '2-digit' })
          }
          monthly[monthKey] = (monthly[monthKey] || 0) + amount
        }
      }
    })

    renderMonthlyChart(monthly)

const recentBox = document.getElementById('recent-activity')
if (records.length > 0) {
  const recent = [...records].reverse().slice(0, 4)
  recentBox.innerHTML = recent.map(r => `
    <div class="category-row">
      <span class="category-name">${r.vendor || 'Unknown'}</span>
      <span class="category-amount">$${parseFloat((r.total || '0').toString().replace(/[^0-9.]/g, '')).toFixed(2)}</span>
    </div>
  `).join('')
} else {
  recentBox.innerHTML = '<p class="empty-text">No recent records</p>'
}

    const breakdownBox = document.getElementById('category-breakdown')
    if (Object.keys(categories).length > 0) {
      breakdownBox.innerHTML = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amount]) => `
          <div class="category-row">
            <span class="category-name">${cat}</span>
            <div class="category-bar-wrap">
              <div class="category-bar" style="width: ${Math.min((amount / total) * 100, 100)}%"></div>
            </div>
            <span class="category-amount">$${amount.toFixed(2)}</span>
          </div>
        `).join('')
    } else {
      breakdownBox.innerHTML = '<p class="empty-text">No categorized records yet</p>'
    }

  } catch (error) {
    console.error('Error loading dashboard:', error)
  }
}

// ── Load records ──
let allRecords = []

async function loadRecords() {
  try {
    const response = await fetch('http://127.0.0.1:5000/records')
    allRecords = await response.json()
    renderRecords(allRecords)
  } catch (error) {
    console.error('Error loading records:', error)
  }
}

function filterRecords() {
  const search = document.getElementById('search-input').value.toLowerCase()
  const category = document.getElementById('filter-category').value

  const filtered = allRecords.filter(r => {
    const matchSearch = !search || (r.vendor && r.vendor.toLowerCase().includes(search))
    const matchCategory = !category || r.category === category
    return matchSearch && matchCategory
  })

  renderRecords(filtered)
}

function renderRecords(records) {
  const tbody = document.getElementById('records-body')

  if (records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-text">No records found</td></tr>'
    return
  }

  tbody.innerHTML = records.map(record => `
    <tr>
      <td><strong>${record.vendor || '-'}</strong></td>
      <td>${record.date || '-'}</td>
      <td><strong>$${parseFloat((record.total || '0').toString().replace(/[^0-9.]/g, '')).toFixed(2)}</strong></td>
      <td><span class="badge">${record.category || '-'}</span></td>
      <td><span class="status-${record.status}">${record.status || '-'}</span></td>
      <td>
        <button class="edit-btn" onclick="openEditModal('${record._id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          
        </button>
        <button class="delete-btn" onclick="deleteRecord('${record._id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          
        </button>
      </td>
    </tr>
  `).join('')
}

// ── Delete record ──
async function deleteRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) return

  try {
    const response = await fetch(`http://127.0.0.1:5000/records/${id}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      loadRecords()
      loadDashboard()
    } else {
      alert('Failed to delete record')
    }
  } catch (error) {
    alert('Something went wrong!')
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadRecords)
document.getElementById('search-input').addEventListener('input', filterRecords)
document.getElementById('filter-category').addEventListener('change', filterRecords)

let monthlyChartInstance = null

function renderMonthlyChart(monthlyData) {
  const ctx = document.getElementById('monthlyChart')
  if (!ctx) return

  if (monthlyChartInstance) {
    monthlyChartInstance.destroy()
  }

  monthlyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(monthlyData),
      datasets: [{
        label: 'Spending',
        data: Object.values(monthlyData),
        backgroundColor: '#a855f7',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '$' + v } }
      }
    }
  })
}

function exportToCSV() {
  if (allRecords.length === 0) {
    alert('No records to export!')
    return
  }

  const headers = ['Vendor', 'Date', 'Total', 'Category']
  const rows = allRecords.map(r => [
    r.vendor || '-',
    r.date || '-',
    r.total || '-',
    r.category || '-',
    
  ])

  let csvContent = headers.join(',') + '\n'
  rows.forEach(row => {
    csvContent += row.map(val => `"${val}"`).join(',') + '\n'
  })

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'spending_records.csv'
  link.click()
  URL.revokeObjectURL(url)
}

document.getElementById('exportBtn').addEventListener('click', exportToCSV)

function openEditModal(id) {
  const record = allRecords.find(r => r._id === id)
  if (!record) return

  document.getElementById('edit-id').value = id
  document.getElementById('edit-vendor').value = record.vendor || ''
  document.getElementById('edit-date').value = record.date || ''
  document.getElementById('edit-total').value = record.total || ''
  document.getElementById('edit-category').value = record.category || 'Other'

  document.getElementById('edit-modal').style.display = 'flex'
}

function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none'
}

async function saveEdit() {
  const id = document.getElementById('edit-id').value
  const vendor = document.getElementById('edit-vendor').value
  const date = document.getElementById('edit-date').value
  const total = document.getElementById('edit-total').value
  const category = document.getElementById('edit-category').value

  try {
    const response = await fetch(`http://127.0.0.1:5000/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor, date, total, category })
    })

    if (response.ok) {
      closeEditModal()
      loadRecords()
      loadDashboard()
    } else {
      alert('Failed to update record')
    }
  } catch (error) {
    alert('Something went wrong!')
  }
}

loadDashboard()