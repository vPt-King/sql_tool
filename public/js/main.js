document.addEventListener('DOMContentLoaded', function () {
    // Modal elements
    const modal = document.getElementById('addRecordModal');
    const errorMessage = document.getElementById('errorMessage');

    // Load tags
    loadTags();

    // Get all dropdowns including search dropdown
    const dropdowns = document.querySelectorAll('.record-dropdown');

    // Handle all dropdowns
    dropdowns.forEach(dropdown => {
        const dropdownBtn = dropdown.querySelector('.record-dropdown-btn');

        if (dropdownBtn) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close all other dropdowns
                dropdowns.forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('active');
                    }
                });
                // Toggle current dropdown
                dropdown.classList.toggle('active');
            });
        }
    });


    document.addEventListener('click', (e) => {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    });

    // Handle search option selection
    window.handleSearchOption = function (option) {
        const searchDropdown = document.querySelector('.search-section .record-dropdown');
        const dropdownBtn = searchDropdown.querySelector('.record-dropdown-btn');

        // Update button text based on selection
        switch (option) {
            case 'name':
                dropdownBtn.textContent = 'Tìm kiếm theo tên';
                break;
            case 'content':
                dropdownBtn.textContent = 'Tìm kiếm trong nội dung';
                break;
            case 'regex':
                dropdownBtn.textContent = 'Regex';
                break;
        }

        // Close dropdown
        searchDropdown.classList.remove('active');
    };

    // Handle record actions
    window.handleRecordAction = function (action) {
        // Find and close the records dropdown
        const recordsDropdown = document.querySelector('.record-dropdown');
        if (recordsDropdown) {
            recordsDropdown.classList.remove('active');
        }

        switch (action) {
            case 'add':
                modal.style.display = 'flex';
                errorMessage.style.display = 'none';
                break;
            case 'all':
                const recordsList = document.querySelector('.records-list');
                if (recordsList) {
                    recordsList.innerHTML = ''; // Clear existing records
                }
                loadAllRecords();
                break;
            case 'edit':
                console.log('Edit record clicked');
                break;
            case 'delete':
                console.log('Delete record clicked');
                break;
        }
    };


    // Form submission handling
    const addRecordForm = document.getElementById('addRecordForm');
    if (addRecordForm) {
        addRecordForm.addEventListener('submit', handleFormSubmit);
    }

    // Close modal function
    window.closeModal = function () {
        modal.style.display = 'none';
        document.getElementById('addRecordForm').reset();
        errorMessage.style.display = 'none';
    };
});

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const tagsInput = document.getElementById('tags');
    const tagError = document.getElementById('tagError');
    const errorMessage = document.getElementById('errorMessage');
    
    // Reset error messages
    tagError.style.display = 'none';
    errorMessage.style.display = 'none';
    
    // Validate tags
    const tagsValue = tagsInput.value.trim();
    if (tagsValue) {
        const tags = tagsValue.split(';').map(tag => tag.trim().toLowerCase()).filter(tag => tag);
        
        // Kiểm tra khoảng trắng trong mỗi tag
        const hasWhitespace = tags.some(tag => tag.includes(' '));
        if (hasWhitespace) {
            tagError.textContent = 'Tags không được chứa khoảng trắng';
            tagError.style.display = 'block';
            return;
        }
    }
    
    // Lấy dữ liệu từ form
    const formData = {
        name: document.getElementById('name').value,
        command: document.getElementById('command').value,
        description: document.getElementById('description').value,
        note: document.getElementById('note').value,
        tags: tagsValue ? tagsValue.split(';').map(tag => tag.trim().toLowerCase()).filter(tag => tag) : []
    };
    
    try {
        // Gửi request lên server
        const response = await fetch('/add-record', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Nếu thành công, đóng modal và reset form
            closeModal();
            // Refresh lại trang để hiển thị record mới
            window.location.reload();
        } else {
            // Hiển thị lỗi từ server nếu có
            errorMessage.textContent = result.error || 'Có lỗi xảy ra khi xử lý yêu cầu';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = 'Có lỗi xảy ra khi gửi yêu cầu';
        errorMessage.style.display = 'block';
    }
}

async function loadTags() {
    try {
        const response = await fetch('/tags');
        const tags = await response.json();
        
        const tagList = document.querySelector('.tag-list');
        if (tagList) {
            tagList.innerHTML = tags.map(tag => `
                <span class="tag-item">${tag.name}</span>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading tags:', error);
    }
}

async function loadAllRecords() {
    try {
        const response = await fetch('/records');
        const records = await response.json();
        
        const recordsList = document.querySelector('.records-list');
        if (recordsList) {
            recordsList.innerHTML = records.map(record => `
                <div class="record-item">
                    <div class="record-name">${record.name}</div>
                    <div class="record-command">${record.command}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading records:', error);
    }
}
