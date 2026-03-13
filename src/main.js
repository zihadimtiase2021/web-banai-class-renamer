// Webflow API এক্সটেনশনে গ্লোবালি এভেইলেবল থাকে
let allStyles = [];
let folderPathsMap = new Map(); // ফোল্ডার পাথ স্টোর করার জন্য

// অ্যাপ শুরু হওয়ার সাথে সাথে Webflow থেকে ডেটা লোড করবে
async function initializeApp() {
    const statusEl = document.getElementById('status');
    try {
        // Webflow থেকে সব স্টাইল নিয়ে আসা
        allStyles = await webflow.getAllStyles();
        
        extractFolders();
        populateDropdown();

        document.getElementById('app-content').style.display = 'block';
        statusEl.textContent = '';
        statusEl.classList.remove('loading');
    } catch (error) {
        console.error("Initialization Error:", error);
        statusEl.textContent = "Error loading data. Make sure you are in Webflow Designer.";
        statusEl.style.color = "red";
    }
}

// ক্লাস নেম থেকে ফোল্ডার স্ট্রাকচার বের করার ফাংশন
function extractFolders() {
    folderPathsMap.clear();
    let pathsSet = new Set();

    allStyles.forEach(style => {
        let name = style.getName();
        // _ এবং - ডিলিমিটার দিয়ে স্ট্রিং ভাগ করা
        let tokens = name.split(/([-_])/);
        let words = tokens.filter((_, i) => i % 2 === 0);

        // ক্লাসগুলোকে ফোল্ডার হিসেবে ট্রিট করা (যদি একের বেশি ওয়ার্ড থাকে)
        let currentPath = [];
        for (let i = 0; i < words.length; i++) {
            currentPath.push(words[i]);
            let pathString = JSON.stringify(currentPath);
            
            if (!pathsSet.has(pathString)) {
                pathsSet.add(pathString);
                // ড্রপডাউনে দেখানোর জন্য ফরম্যাট করা (যেমন: section > hero)
                folderPathsMap.set(pathString, {
                    display: currentPath.join(' > '),
                    arrayValue: [...currentPath]
                });
            }
        }
    });
}

// ড্রপডাউনে ফোল্ডারগুলো অ্যাড করা
function populateDropdown() {
    const selectEl = document.getElementById('folder-select');
    selectEl.innerHTML = ''; // আগের ডেটা ক্লিয়ার করা

    // অ্যালফাবেটিক্যালি সর্ট করে ড্রপডাউনে বসানো
    const sortedPaths = Array.from(folderPathsMap.values()).sort((a, b) => a.display.localeCompare(b.display));

    sortedPaths.forEach(pathData => {
        let option = document.createElement('option');
        // JSON স্ট্রিং হিসেবে ভ্যালু রাখা, যাতে পরে অ্যারে রিকভার করা যায়
        option.value = JSON.stringify(pathData.arrayValue); 
        option.textContent = pathData.display;
        selectEl.appendChild(option);
    });
}

// ফোল্ডার রিনেম করার মেইন ফাংশন
async function handleRename() {
    const selectEl = document.getElementById('folder-select');
    const inputEl = document.getElementById('new-name-input');
    const statusEl = document.getElementById('status');
    const renameBtn = document.getElementById('rename-btn');

    const selectedPathStr = selectEl.value;
    const newName = inputEl.value.trim();

    if (!selectedPathStr || !newName) {
        statusEl.textContent = "Please enter a new name!";
        statusEl.style.color = "red";
        return;
    }

    // স্পেস বা স্পেশাল ক্যারেক্টার চেক (Webflow ক্লাসে সাধারণত এলাউড না)
    if (/[^a-zA-Z0-9]/.test(newName)) {
        statusEl.textContent = "Please use only letters and numbers.";
        statusEl.style.color = "red";
        return;
    }

    const targetPathArray = JSON.parse(selectedPathStr);
    const targetDepth = targetPathArray.length - 1;

    try {
        renameBtn.disabled = true;
        statusEl.style.color = "#0073e6";
        statusEl.textContent = "Renaming... Please wait.";

        let renamedCount = 0;

        for (let style of allStyles) {
            let name = style.getName();
            let tokens = name.split(/([-_])/);
            let words = tokens.filter((_, i) => i % 2 === 0);

            // চেক করা ক্লাসটি টার্গেট ফোল্ডারের আন্ডারে কি না
            if (words.length >= targetPathArray.length) {
                let isMatch = true;
                for (let i = 0; i < targetPathArray.length; i++) {
                    if (words[i] !== targetPathArray[i]) {
                        isMatch = false;
                        break;
                    }
                }

                if (isMatch) {
                    let tokenIndexToReplace = targetDepth * 2;
                    tokens[tokenIndexToReplace] = newName;
                    let newClassName = tokens.join('');
                    
                    style.setName(newClassName);
                    await style.save();
                    renamedCount++;
                }
            }
        }

        // রিনেম শেষ হলে ডেটা রিফ্রেশ করা
        inputEl.value = '';
        await initializeApp(); 

        statusEl.style.color = "#28a745";
        statusEl.textContent = `Success! Updated ${renamedCount} class(es).`;

    } catch (error) {
        console.error("Rename Error:", error);
        statusEl.style.color = "red";
        statusEl.textContent = "An error occurred while renaming.";
    } finally {
        renameBtn.disabled = false;
    }
}

// ইভেন্ট লিসেনার
document.getElementById('rename-btn').addEventListener('click', handleRename);

// অ্যাপ লোড করা
initializeApp();