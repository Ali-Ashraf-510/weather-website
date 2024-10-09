const apiKey = '7d77b96c972b4d119a3151101212704'; // استبدل بـ API Key الخاص بك

let isCelsius = true; // الوحدة الافتراضية لدرجة الحرارة
let currentWeatherData = null; // لتخزين بيانات الطقس الحالية

// عناصر الـ DOM
const cityInput = document.getElementById('city-input');
const cityList = document.getElementById('city-list');
const getWeatherBtn = document.getElementById('get-weather-btn');
const weatherResult = document.getElementById('weather-result');
const toggleUnitBtn = document.getElementById('toggle-unit');

// مستمعي الأحداث
cityInput.addEventListener('input', debounce(fetchCities, 300));
cityInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        getWeather();
    }
});
getWeatherBtn.addEventListener('click', getWeather);
toggleUnitBtn.addEventListener('click', toggleTemperatureUnit);

// دالة التراجع لتقليل عدد مكالمات الـ API أثناء الكتابة
function debounce(func, delay) {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

// جلب اقتراحات المدن بناءً على الإدخال
function fetchCities() {
    const query = cityInput.value.trim();
    if (query.length > 0) {
        fetch(`https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                displayCitySuggestions(data);
            })
            .catch(error => {
                console.error('خطأ في جلب بيانات المدن:', error);
                cityList.innerHTML = '<div class="list-group-item text-danger">خطأ في جلب بيانات المدن.</div>';
                cityList.style.display = 'block';
            });
    } else {
        cityList.innerHTML = '';
        cityList.style.display = 'none';
    }
}

// عرض اقتراحات المدن
function displayCitySuggestions(cities) {
    cityList.innerHTML = '';
    if (cities.length > 0) {
        cities.forEach(city => {
            const cityItem = document.createElement('button');
            cityItem.type = 'button';
            cityItem.className = 'list-group-item list-group-item-action city-item';
            cityItem.innerText = `${city.name}, ${city.country}`;
            cityItem.onclick = () => {
                cityInput.value = city.name;
                cityList.innerHTML = '';
                cityList.style.display = 'none';
                getWeather();
            };
            cityList.appendChild(cityItem);
        });
        cityList.style.display = 'block';
    } else {
        cityList.innerHTML = '<div class="list-group-item">لم يتم العثور على نتائج.</div>';
        cityList.style.display = 'block';
    }
}

// جلب وعرض بيانات الطقس
function getWeather() {
    const city = cityInput.value.trim();
    if (city) {
        // عرض مؤشر التحميل
        weatherResult.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 200px;">
                <div class="spinner-border text-primary" role="status" aria-label="جار التحميل">
                    <span class="visually-hidden">جار التحميل...</span>
                </div>
            </div>
        `;

        fetch(`https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=3&aqi=no&alerts=no`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    weatherResult.innerHTML = `<div class="text-danger text-center">${data.error.message}</div>`;
                    setBackground('default');
                } else {
                    currentWeatherData = data; // تخزين البيانات الأصلية
                    displayWeather(data);
                    setBackground(data.current.condition.text.toLowerCase());
                    savePreferences(city, isCelsius ? 'C' : 'F');
                }
            })
            .catch(error => {
                console.error('خطأ في جلب بيانات الطقس:', error);
                weatherResult.innerHTML = '<div class="text-danger text-center">خطأ في جلب بيانات الطقس. حاول مرة أخرى.</div>';
                setBackground('default');
            });
    } else {
        weatherResult.innerHTML = '<div class="text-warning text-center">يرجى إدخال اسم مدينة.</div>';
        setBackground('default');
    }
}

// عرض بيانات الطقس على الواجهة
function displayWeather(data) {
    weatherResult.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h2 class="card-title">${data.location.name}, ${data.location.country}</h2>
                <p class="card-subtitle mb-2 text-muted">${data.current.last_updated}</p>
                <div id="current-weather" class="d-flex flex-column align-items-center">
                    <div id="current-icon" class="weather-icon"></div>
                    <h3 id="current-temp">${formatTemperature(data.current.temp_c, 'current-temp')}</h3>
                    <p id="current-condition">${data.current.condition.text}</p>
                    <p>الرطوبة: ${data.current.humidity}%</p>
                    <p>الرياح: ${data.current.wind_kph} كيلومتر/ساعة</p>
                </div>
            </div>
        </div>
        <div class="row mt-4 justify-content-center">
            ${data.forecast.forecastday.map(day => forecastCard(day)).join('')}
        </div>
    `;

    // تحميل أيقونة الطقس الحالية
    loadLottieAnimation(data.current.condition.code, 'current-icon');

    // تحميل أيقونات الطقس للتوقعات
    data.forecast.forecastday.forEach(day => {
        const forecastIconId = `forecast-icon-${day.date}`;
        loadLottieAnimation(day.day.condition.code, forecastIconId);
    });
}

// إنشاء بطاقة التوقع
function forecastCard(day) {
    const date = new Date(day.date);
    const daysOfWeek = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const dayName = daysOfWeek[date.getDay()];

    return `
        <div class="col-lg-4 col-md-6 col-sm-12">
            <div class="card mb-3">
                <div class="card-body text-center">
                    <h5 class="card-title">${dayName}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${day.date}</h6>
                    <div id="forecast-icon-${day.date}" class="weather-icon"></div>
                    <p class="card-text">متوسط الحرارة: ${formatTemperature(day.day.avgtemp_c, `forecast-temp-${day.date}`)}</p>
                    <p class="card-text">الحالة: ${day.day.condition.text}</p>
                    <p class="card-text">شروق الشمس: ${day.astro.sunrise}</p>
                    <p class="card-text">غروب الشمس: ${day.astro.sunset}</p>
                    <p class="card-text">مؤشر الأشعة فوق البنفسجية: ${day.day.uv}</p>
                </div>
            </div>
        </div>
    `;
}

// تنسيق درجة الحرارة بناءً على الوحدة المختارة
function formatTemperature(tempC, elementId) {
    const tempElement = document.getElementById(elementId);
    let temperature = '';

    if (isCelsius) {
        temperature = `${Math.round(tempC)}°C`;
    } else {
        const tempF = (tempC * 9/5) + 32;
        temperature = `${Math.round(tempF)}°F`;
    }

    if (tempElement) {
        tempElement.innerHTML = temperature;
    }

    return temperature;
}

// تبديل وحدة درجة الحرارة بين السيلسيوس والفهرنهايت
function toggleTemperatureUnit() {
    isCelsius = !isCelsius;
    toggleUnitBtn.innerText = isCelsius ? 'التبديل إلى °F' : 'التبديل إلى °C';

    if (currentWeatherData) {
        // تحديث درجة الحرارة الحالية
        formatTemperature(currentWeatherData.current.temp_c, 'current-temp');

        // تحديث درجات الحرارة في التوقعات
        currentWeatherData.forecast.forecastday.forEach(day => {
            formatTemperature(day.day.avgtemp_c, `forecast-temp-${day.date}`);
        });

        // حفظ التفضيلات
        savePreferences(currentWeatherData.location.name, isCelsius ? 'C' : 'F');
    }
}

// تغيير الخلفية بناءً على حالة الطقس
function setBackground(condition) {
    const body = document.body;
    body.className = ''; // إعادة تعيين الفئات الحالية

    console.log('حالة الطقس:', condition); // للتحقق من الحالة في الكونسول

    if (condition.includes('sun') || condition.includes('clear')) {
        body.classList.add('clear-theme');
    } else if (condition.includes('cloud')) {
        body.classList.add('clouds-theme');
    } else if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('mist') || condition.includes('fog')) {
        body.classList.add('rain-theme');
    } else if (condition.includes('snow')) {
        body.classList.add('snow-theme');
    } else if (condition.includes('thunder')) {
        body.classList.add('thunderstorm-theme');
    } else if (condition.includes('haze') || condition.includes('smoke') || condition.includes('dust') || condition.includes('sand') || condition.includes('ash')) {
        body.classList.add('atmosphere-theme');
    } else {
        body.classList.add('default-theme');
    }
}

// تحميل وتشغيل أنيميشن Lottie بناءً على كود الحالة
function loadLottieAnimation(conditionCode, containerId) {
    let animationPath = '';

    // تحديد رابط أنيميشن Lottie بناءً على كود حالة الطقس
    if (conditionCode === 1000) { // صافٍ
        animationPath = 'https://assets6.lottiefiles.com/packages/lf20_touohxv0.json';
    } else if ([1003, 1006, 1009].includes(conditionCode)) { // غائم جزئي، غائم، مكتوم
        animationPath = 'https://assets6.lottiefiles.com/packages/lf20_jxmzrbuc.json';
    } else if ([1063, 1069, 1072, 1150, 1153, 1180].includes(conditionCode)) { // أمطار مختلفة
        animationPath = 'https://assets6.lottiefiles.com/packages/lf20_tfb3estd.json';
    } else if ([1066, 1114, 1213, 1216].includes(conditionCode)) { // تساقط الثلوج
        animationPath = 'https://assets6.lottiefiles.com/packages/lf20_lprxuopu.json';
    } else if ([1087, 1273, 1276, 1279].includes(conditionCode)) { // عاصفة رعدية
        animationPath = 'https://assets6.lottiefiles.com/packages/lf20_puciaact.json';
    } else { // حالات جوية أخرى مثل ضباب أو دخان
        animationPath = 'https://assets6.lottiefiles.com/packages/lf20_yr6zz3wv.json';
    }

    // تحميل أنيميشن Lottie
    lottie.loadAnimation({
        container: document.getElementById(containerId),
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: animationPath
    });
}

// حفظ التفضيلات في Local Storage
function savePreferences(city, unit) {
    localStorage.setItem('lastCity', city);
    localStorage.setItem('temperatureUnit', unit);
}

// تحميل التفضيلات من Local Storage عند بدء التطبيق
function loadPreferences() {
    const lastCity = localStorage.getItem('lastCity');
    const tempUnit = localStorage.getItem('temperatureUnit');

    if (lastCity) {
        cityInput.value = lastCity;
        getWeather();
    }

    if (tempUnit) {
        isCelsius = tempUnit === 'C';
        toggleUnitBtn.innerText = isCelsius ? 'التبديل إلى °F' : 'التبديل إلى °C';
    }
}

// تفعيل تحميل التفضيلات عند تحميل الصفحة
window.onload = loadPreferences;
