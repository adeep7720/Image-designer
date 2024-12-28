let originalImage = null;
const REMOVE_BG_API_KEY = 'kvQ68BdkbKkLgpSMZ4XwuedA';

// التأكد من تحميل OpenCV
function onOpenCvReady() {
    console.log('OpenCV.js is ready');
    document.getElementById('loadingMessage').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
}

// تحميل الصورة
document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                document.getElementById('originalImage').src = event.target.result;
                originalImage = img;
                resetImage();
                enableSaveButtons(); // تفعيل أزرار الحفظ
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// دالة لمسح الخلفية باستخدام Remove.bg API
async function removeBackground(imageFile) {
    const formData = new FormData();
    formData.append('image_file', imageFile);

    try {
        document.getElementById('loadingMessage').textContent = 'جاري معالجة الصورة...';
        document.getElementById('loadingMessage').style.display = 'block';

        const response = await fetch('https://api.remove.bg/v1.0/removebg', {
            method: 'POST',
            headers: {
                'X-Api-Key': REMOVE_BG_API_KEY
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('فشل في معالجة الصورة');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // تحديث الصورة المعالجة
        const processedImage = new Image();
        processedImage.onload = function() {
            const canvas = document.getElementById('filteredImage');
            canvas.width = this.width;
            canvas.height = this.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this, 0, 0);
            URL.revokeObjectURL(url);
        };
        processedImage.src = url;
        
        document.getElementById('loadingMessage').style.display = 'none';
    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء معالجة الصورة');
        document.getElementById('loadingMessage').style.display = 'none';
    }
}

// تطبيق الفلتر
let currentFrame = 0;
const totalFrames = 20; // زيادة عدد الإطارات إلى 20

function applyFilter(filterType) {
    if (!originalImage) {
        alert('الرجاء اختيار صورة أولاً');
        return;
    }

    const canvas = document.getElementById('filteredImage');
    const ctx = canvas.getContext('2d');

    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);

    try {
        if (filterType === 'remove-bg') {
            // تحويل الصورة الحالية إلى ملف
            canvas.toBlob(function(blob) {
                const file = new File([blob], 'image.png', { type: 'image/png' });
                removeBackground(file);
            }, 'image/png');
            return;
        }

        let src = cv.imread(canvas);
        let dst = new cv.Mat();

        switch (filterType) {
            case 'brightness':
                src.convertTo(dst, -1, 1.2, 30);
                break;
            case 'contrast':
                src.convertTo(dst, -1, 1.5, 0);
                break;
            case 'sharpen':
                let kernel = new cv.Mat(3, 3, cv.CV_32F);
                kernel.data32F.set([0, -1, 0, -1, 5, -1, 0, -1, 0]);
                cv.filter2D(src, dst, -1, kernel, new cv.Point(-1, -1), 0, cv.BORDER_DEFAULT);
                kernel.delete();
                break;
            case 'warmth':
                dst = src.clone();
                for (let i = 0; i < src.rows; i++) {
                    for (let j = 0; j < src.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        pixel[0] = Math.min(255, pixel[0] * 1.2);
                        pixel[2] = Math.max(0, pixel[2] * 0.8);
                    }
                }
                break;
            case 'cool':
                dst = src.clone();
                for (let i = 0; i < src.rows; i++) {
                    for (let j = 0; j < src.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        pixel[2] = Math.min(255, pixel[2] * 1.2);
                        pixel[0] = Math.max(0, pixel[0] * 0.8);
                    }
                }
                break;
            case 'grayscale':
                cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0);
                cv.cvtColor(dst, dst, cv.COLOR_GRAY2RGBA, 0);
                break;
            case 'sepia':
                dst = src.clone();
                for (let i = 0; i < src.rows; i++) {
                    for (let j = 0; j < src.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        let r = pixel[0], g = pixel[1], b = pixel[2];
                        pixel[0] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
                        pixel[1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
                        pixel[2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                    }
                }
                break;
            case 'blur':
                let ksize = new cv.Size(5, 5);
                cv.GaussianBlur(src, dst, ksize, 0, 0, cv.BORDER_DEFAULT);
                break;
            case 'vintage':
                dst = src.clone();
                for (let i = 0; i < src.rows; i++) {
                    for (let j = 0; j < src.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        let r = pixel[0], g = pixel[1], b = pixel[2];
                        pixel[0] = Math.min(255, (r * 0.9) + (g * 0.05) + (b * 0.05) + 20);
                        pixel[1] = Math.min(255, (r * 0.05) + (g * 0.85) + (b * 0.1) + 10);
                        pixel[2] = Math.min(255, (r * 0.1) + (g * 0.1) + (b * 0.8) + 5);
                        for (let c = 0; c < 3; c++) {
                            pixel[c] = Math.min(255, pixel[c] * 0.9 + 20);
                        }
                    }
                }
                break;
            case 'vibrant':
                dst = src.clone();
                for (let i = 0; i < src.rows; i++) {
                    for (let j = 0; j < src.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        for (let c = 0; c < 3; c++) {
                            let color = pixel[c];
                            if (color > 127) {
                                pixel[c] = Math.min(255, color * 1.2);
                            } else {
                                pixel[c] = Math.max(0, color * 0.8);
                            }
                        }
                    }
                }
                break;
            case 'ring-light':
                dst = src.clone();
                
                // حساب مركز الصورة
                let centerX = src.cols / 2;
                let centerY = src.rows / 2;
                
                // حساب نصف قطر الإضاءة الدائرية (40% من عرض الصورة)
                let radius = Math.min(src.cols, src.rows) * 0.4;
                
                // إنشاء ماسك للإضاءة الدائرية
                let mask = new cv.Mat(src.rows, src.cols, cv.CV_32F, new cv.Scalar(0));
                
                for (let i = 0; i < src.rows; i++) {
                    for (let j = 0; j < src.cols; j++) {
                        // حساب المسافة من المركز
                        let distance = Math.sqrt(Math.pow(j - centerX, 2) + Math.pow(i - centerY, 2));
                        
                        // حساب شدة الإضاءة بناءً على المسافة
                        let intensity;
                        if (distance < radius) {
                            // منطقة الإضاءة الداخلية
                            intensity = 1.0 - Math.pow(distance / radius, 2) * 0.3;
                        } else {
                            // تلاشي تدريجي للإضاءة
                            let falloff = Math.max(0, 1 - (distance - radius) / (radius * 0.5));
                            intensity = 0.7 * falloff;
                        }
                        
                        mask.floatPtr(i, j)[0] = intensity;
                    }
                }
                
                // تطبيق الإضاءة على الصورة
                for (let i = 0; i < src.rows; i++) {
                    for (let j = 0; j < src.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        let intensity = mask.floatPtr(i, j)[0];
                        
                        // تعديل السطوع والتباين
                        for (let c = 0; c < 3; c++) {
                            let value = pixel[c];
                            
                            // زيادة السطوع في منطقة الإضاءة
                            value = value * (1 + intensity * 0.3);
                            
                            // تحسين التباين
                            value = 128 + (value - 128) * (1 + intensity * 0.2);
                            
                            // إضافة لمسة دافئة للإضاءة
                            if (c === 0) { // الأحمر
                                value *= (1 + intensity * 0.1);
                            } else if (c === 1) { // الأخضر
                                value *= (1 + intensity * 0.05);
                            }
                            
                            pixel[c] = Math.min(255, Math.max(0, value));
                        }
                    }
                }
                
                // تنظيف الذاكرة
                mask.delete();
                break;
            case 'canon-eos':
                // 1. تحويل الصورة إلى LAB للتحكم الدقيق بالألوان
                let labImage = new cv.Mat();
                cv.cvtColor(src, labImage, cv.COLOR_RGB2Lab);

                // 2. تحسين التباين والحدة
                let sharpenKernel = new cv.Mat(3, 3, cv.CV_32F);
                sharpenKernel.data32F.set([
                    -0.5, -0.5, -0.5,
                    -0.5,  5.0, -0.5,
                    -0.5, -0.5, -0.5
                ]);

                // 3. تطبيق الحدة المميزة
                dst = src.clone();
                cv.filter2D(dst, dst, -1, sharpenKernel);

                // 4. تعديل الألوان لمحاكاة خصائص الكاميرا
                for (let i = 0; i < dst.rows; i++) {
                    for (let j = 0; j < dst.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        
                        // تحسين التشبع والتباين
                        for (let c = 0; c < 3; c++) {
                            // زيادة التباين
                            let color = pixel[c];
                            color = color - 128;
                            color = color * 1.2; // زيادة التباين
                            color = color + 128;
                            
                            // تحسين الألوان
                            if (c === 0) { // الأحمر
                                color = color * 1.05;
                            } else if (c === 1) { // الأخضر
                                color = color * 1.02;
                            } else { // الأزرق
                                color = color * 0.98;
                            }
                            
                            pixel[c] = Math.min(255, Math.max(0, color));
                        }
                    }
                }

                // 5. تطبيق تأثير الظلال والإضاءة
                let shadows = new cv.Mat();
                let highlights = new cv.Mat();
                
                cv.threshold(dst, shadows, 60, 255, cv.THRESH_BINARY_INV);
                cv.threshold(dst, highlights, 190, 255, cv.THRESH_BINARY);
                
                // تحسين الظلال
                for (let i = 0; i < dst.rows; i++) {
                    for (let j = 0; j < dst.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        let shadowPixel = shadows.ucharPtr(i, j);
                        let highlightPixel = highlights.ucharPtr(i, j);
                        
                        for (let c = 0; c < 3; c++) {
                            if (shadowPixel[c] > 0) {
                                pixel[c] = Math.max(0, pixel[c] - 10);
                            }
                            if (highlightPixel[c] > 0) {
                                pixel[c] = Math.min(255, pixel[c] + 5);
                            }
                        }
                    }
                }

                // تنظيف الذاكرة
                labImage.delete();
                sharpenKernel.delete();
                shadows.delete();
                highlights.delete();
                break;
            case 'fog':
                dst = src.clone();
                
                // تطبيق تأثير الضباب الأساسي
                let ksizeFog = new cv.Size(25, 25);
                cv.GaussianBlur(dst, dst, ksizeFog, 0, 0, cv.BORDER_DEFAULT);
                
                // تعديل السطوع والتباين
                for (let i = 0; i < dst.rows; i++) {
                    for (let j = 0; j < dst.cols; j++) {
                        let pixel = dst.ucharPtr(i, j);
                        for (let c = 0; c < 3; c++) {
                            // إضافة تأثير الضباب
                            pixel[c] = Math.min(255, pixel[c] * 0.8 + 50);
                        }
                    }
                }
                break;
            case 'frame':
                // إعادة ترتيب الإطارات لتبدأ بالإطارات المضيئة
                let frameClass = '';
                currentFrame++;
                if (currentFrame > totalFrames) {
                    currentFrame = 1;
                }

                // إزالة جميع الإطارات السابقة
                for (let i = 1; i <= totalFrames; i++) {
                    canvas.classList.remove(`frame-${i}`);
                }

                // ترتيب جديد للإطارات يبدأ بالإطارات المضيئة
                switch(currentFrame) {
                    // الإطارات المضيئة أولاً
                    case 1:
                        frameClass = 'frame-16'; // إطار متقطع مضيء
                        break;
                    case 2:
                        frameClass = 'frame-17'; // إطار نيون نابض
                        break;
                    case 3:
                        frameClass = 'frame-18'; // إطار دائري مضيء
                        break;
                    case 4:
                        frameClass = 'frame-19'; // إطار متحرك مضيء
                        break;
                    case 5:
                        frameClass = 'frame-20'; // إطار مقطوع مضيء
                        break;
                    // ثم باقي الإطارات
                    case 6:
                        frameClass = 'frame-1';
                        break;
                    case 7:
                        frameClass = 'frame-2';
                        break;
                    case 8:
                        frameClass = 'frame-3';
                        break;
                    case 9:
                        frameClass = 'frame-4';
                        break;
                    case 10:
                        frameClass = 'frame-5';
                        break;
                    case 11:
                        frameClass = 'frame-6';
                        break;
                    case 12:
                        frameClass = 'frame-7';
                        break;
                    case 13:
                        frameClass = 'frame-8';
                        break;
                    case 14:
                        frameClass = 'frame-9';
                        break;
                    case 15:
                        frameClass = 'frame-10';
                        break;
                    case 16:
                        frameClass = 'frame-11';
                        break;
                    case 17:
                        frameClass = 'frame-12';
                        break;
                    case 18:
                        frameClass = 'frame-13';
                        break;
                    case 19:
                        frameClass = 'frame-14';
                        break;
                    case 20:
                        frameClass = 'frame-15';
                        break;
                }

                canvas.classList.add(frameClass);
                // لا نحتاج لمعالجة الصورة نفسها
                dst = src.clone();
                break;
        }

        if (dst.rows > 0 && dst.cols > 0) {
            cv.imshow('filteredImage', dst);
        }
        
        src.delete();
        dst.delete();
    } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء معالجة الصورة');
    }
}

// متغيرات Double Exposure
let secondImage = null;

// فتح نافذة Double Exposure
function openDoubleExposure() {
    if (!originalImage) {
        showNotification('الرجاء تحميل صورة أولاً', 'info');
        return;
    }
    document.getElementById('doubleExposureModal').style.display = 'block';
}

// إغلاق نافذة Double Exposure
function closeDoubleExposure() {
    const modal = document.getElementById('doubleExposureModal');
    modal.style.display = 'none';
    document.getElementById('secondImage').value = '';
}

// تحديث قيمة الشفافية
document.getElementById('blendOpacity').addEventListener('input', function() {
    document.getElementById('opacityValue').textContent = this.value + '%';
});

// تحميل الصورة الثانية
document.getElementById('secondImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            secondImage = new Image();
            secondImage.crossOrigin = "Anonymous"; // إضافة هذا السطر
            secondImage.onload = function() {
                console.log('تم تحميل الصورة الثانية بنجاح:', {
                    width: secondImage.width,
                    height: secondImage.height
                });
                showNotification('تم تحميل الصورة الثانية بنجاح', 'success');
            };
            secondImage.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// تطبيق تأثير Double Exposure
async function applyDoubleExposure() {
    try {
        console.log('بدء عملية الدمج...');
        console.log('الصورة الأصلية:', originalImage);
        console.log('الصورة الثانية:', secondImage);

        // التحقق من وجود الصور
        if (!originalImage) {
            showNotification('الرجاء تحميل الصورة الأولى', 'info');
            return;
        }
        if (!secondImage) {
            showNotification('الرجاء تحميل الصورة الثانية', 'info');
            return;
        }

        // الحصول على الكانفاس والسياق
        const canvas = document.querySelector('canvas');
        if (!canvas) {
            throw new Error('لم يتم العثور على عنصر الكانفاس');
        }
        const ctx = canvas.getContext('2d');

        console.log('أبعاد الصورة الأصلية:', {
            width: originalImage.width,
            height: originalImage.height
        });

        // تعيين حجم الكانفاس
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;

        // رسم الصورة الأصلية
        ctx.drawImage(originalImage, 0, 0);
        console.log('تم رسم الصورة الأصلية');

        // الحصول على إعدادات المزج
        const blendMode = document.getElementById('blendMode').value;
        const opacity = document.getElementById('blendOpacity').value / 100;
        console.log('إعدادات المزج:', { blendMode, opacity });

        // تطبيق إعدادات المزج
        ctx.globalCompositeOperation = blendMode;
        ctx.globalAlpha = opacity;

        // رسم الصورة الثانية
        await new Promise((resolve) => {
            if (secondImage.complete) {
                ctx.drawImage(secondImage, 0, 0, canvas.width, canvas.height);
                resolve();
            } else {
                secondImage.onload = () => {
                    ctx.drawImage(secondImage, 0, 0, canvas.width, canvas.height);
                    resolve();
                };
            }
        });
        console.log('تم رسم الصورة الثانية');

        // إعادة تعيين الإعدادات
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;

        // تحديث المتغيرات
        currentImage = canvas;

        // إغلاق النافذة وإظهار رسالة نجاح
        closeDoubleExposure();
        showNotification('تم تطبيق الدمج بنجاح!', 'success');
        console.log('اكتملت عملية الدمج بنجاح');

    } catch (error) {
        console.error('تفاصيل الخطأ:', {
            message: error.message,
            stack: error.stack,
            originalImage: !!originalImage,
            secondImage: !!secondImage
        });
        showNotification('حدث خطأ أثناء تطبيق الدمج: ' + error.message, 'error');
    }
}

// إضافة معالج حدث للنقر خارج النافذة
window.addEventListener('click', function(event) {
    const modal = document.getElementById('doubleExposureModal');
    if (event.target === modal) {
        closeDoubleExposure();
    }
});

// إعادة تعيين الصورة
function resetImage() {
    if (!originalImage) return;

    const canvas = document.getElementById('filteredImage');
    const ctx = canvas.getContext('2d');
    
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    ctx.drawImage(originalImage, 0, 0);
}

// تحميل الصورة المعدلة
function downloadImage() {
    const canvas = document.getElementById('filteredImage');
    if (canvas.toDataURL) {
        const link = document.createElement('a');
        link.download = 'filtered_image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}

// تفعيل أزرار الحفظ عند تحميل صورة
function enableSaveButtons() {
    document.querySelector('.png-btn').disabled = false;
    document.querySelector('.jpg-btn').disabled = false;
}

// تعطيل أزرار الحفظ
function disableSaveButtons() {
    document.querySelector('.png-btn').disabled = true;
    document.querySelector('.jpg-btn').disabled = true;
}

// دالة حفظ الصورة
function saveImage(format) {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    // إنشاء رابط مؤقت للتحميل
    const link = document.createElement('a');
    const timestamp = new Date().getTime();
    const filename = `edited_image_${timestamp}.${format}`;

    // تحديد نوع الملف وجودته
    let mimeType = 'image/png';
    let quality = 1.0;

    if (format === 'jpg') {
        mimeType = 'image/jpeg';
        quality = 0.9; // جودة عالية للـ JPG
    }

    // تحويل الصورة إلى URL
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = filename;
        
        // إضافة تأثير تحميل
        const button = document.querySelector(`.${format}-btn`);
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
        
        // تنفيذ التحميل
        setTimeout(() => {
            link.click();
            URL.revokeObjectURL(url);
            button.innerHTML = originalText;
            
            // إظهار رسالة نجاح
            showNotification('تم حفظ الصورة بنجاح!', 'success');
        }, 500);
    }, mimeType, quality);
}

// دالة إظهار الإشعارات
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        ${message}
    `;
    document.body.appendChild(notification);
    
    // تحريك الإشعار
    setTimeout(() => {
        notification.style.transform = 'translateY(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // إخفاء الإشعار
    setTimeout(() => {
        notification.style.transform = 'translateY(-20px)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// كود التحكم في الوضع المظلم/المضيء
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');

// تعيين الوضع المظلم كافتراضي دائماً
if (!localStorage.getItem('theme')) {
    localStorage.setItem('theme', 'dark');
}

const currentTheme = localStorage.getItem('theme');
document.documentElement.setAttribute('data-theme', currentTheme);

// تحديث حالة الزر
toggleSwitch.checked = currentTheme === 'dark';

function switchTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

// إضافة مستمع الحدث
toggleSwitch.addEventListener('change', switchTheme, false);

// التأكد من تطبيق الوضع المظلم عند تحميل الصفحة
window.addEventListener('load', () => {
    if (!localStorage.getItem('theme') || localStorage.getItem('theme') !== 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
        toggleSwitch.checked = true;
        localStorage.setItem('theme', 'dark');
    }
});

// إضافة معالج حدث للتأكد من تحميل الصور
function checkImagesLoaded() {
    if (!originalImage) {
        showNotification('الرجاء تحميل الصورة الأولى', 'info');
        return false;
    }
    if (!secondImage) {
        showNotification('الرجاء تحميل الصورة الثانية', 'info');
        return false;
    }
    return true;
}
