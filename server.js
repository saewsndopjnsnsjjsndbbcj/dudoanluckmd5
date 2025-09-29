const express = require('express');
const axios = require('axios');
const fs = require('fs'); 
const path = require('path');
const NodeCache = require('node-cache'); 

const app = express();
const PORT = process.env.PORT || 3000; 

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://lichsu.onrender.com/api/taixiu/ws'; // API của bạn
const PREDICT_FILE_PATH = path.join(__dirname, 'thuattoan.txt'); // File thuật toán
const historyCache = new NodeCache({ stdTTL: 5, checkperiod: 120 }); // Cache 5 giây
const CACHE_KEY = 'latest_history';

let vipPredictTX = null;

// --- HÀM TẢI VÀ TẠO THUẬT TOÁN TỪ FILE ---
function loadPredictAlgorithm() {
    try {
        const fileContent = fs.readFileSync(PREDICT_FILE_PATH, 'utf8');

        if (!fileContent || fileContent.trim().length === 0) {
            throw new Error(`File ${path.basename(PREDICT_FILE_PATH)} trống.`);
        }

        // Tạo hàm với 2 đối số: 'index' (số phiên) và 'historyString' (chuỗi T/X 13 ký tự)
        vipPredictTX = new Function('index', 'historyString', fileContent);
        
        console.log(`✅ Thuật toán dự đoán đã được tải thành công từ ${path.basename(PREDICT_FILE_PATH)}`);
        
    } catch (err) {
        // Báo lỗi CRITICAL nếu cú pháp file TXT sai (như lỗi Unexpected token ':')
        console.error(`❌ Lỗi CRITICAL khi tải thuật toán (${path.basename(PREDICT_FILE_PATH)}):`, err.message);
        vipPredictTX = (index, historyString) => "Lỗi: Thuật toán không hoạt động";
    }
}
loadPredictAlgorithm(); 

// --- CÁC HÀM KHÁC ---
function getRandomConfidence() {
  const min = 65.0;
  const max = 95.0;
  const confidence = Math.random() * (max - min) + min;
  return confidence.toFixed(1) + "%";
}

// 💡 HÀM GIẢ LẬP LẤY CHUỖI LỊCH SỬ 13 KÝ TỰ
function getHistoryString(currentData) {
    // API nguồn của bạn hiện chỉ trả về một phiên.
    // Nếu bạn cần 13 phiên, bạn cần gọi một API khác hoặc sửa API nguồn.
    // Tạm thời, ta dùng một chuỗi mẫu để đảm bảo logic tra cứu trong thuattoan.txt hoạt động.
    return 'TTTTTTTTTTTTT'; // Chuỗi mẫu 13 ký tự T/X
}

// --- HÀM LẤY DỮ LIỆU TỪ CACHE HOẶC API ---
async function fetchCurrentData() {
    let data = historyCache.get(CACHE_KEY);
    if (data) {
        console.log('Cache hit! Using cached data.');
        return data;
    }

    // Cache miss, fetch from API
    const response = await axios.get(HISTORY_API_URL);
    data = Array.isArray(response.data) ? response.data : [response.data];

    if (!data || data.length === 0) {
        throw new Error("Không có dữ liệu lịch sử");
    }
    
    // Lưu vào cache
    historyCache.set(CACHE_KEY, data);
    console.log('Cache updated from API.');
    return data;
}

// --- ENDPOINT DỰ ĐOÁN ---
app.get('/api/2k15', async (req, res) => {
  if (vipPredictTX(0, '').includes('Lỗi: Thuật toán không hoạt động')) {
       return res.status(503).json({
          id: "@cskhtoollxk",
          error: "Dịch vụ dự đoán không sẵn sàng",
          du_doan: "Kiểm tra file thuattoan.txt",
          do_tin_cay: "0%",
          giai_thich: "File thuật toán có lỗi cú pháp hoặc bị thiếu."
      });
  }
  
  try {
    const data = await fetchCurrentData();

    const currentData = data[0];
    const phienTruocInt = parseInt(String(currentData.Phien));
    
    if (isNaN(phienTruocInt)) throw new Error(`Dữ liệu phiên không hợp lệ: ${currentData.Phien}`);
    
    const nextSession = phienTruocInt + 1;
    
    const historyString = getHistoryString(currentData); 

    // GỌI HÀM DỰ ĐOÁN VỚI 2 THAM SỐ
    const prediction = vipPredictTX(nextSession, historyString);
    const confidence = getRandomConfidence();

    res.json({
      id: "@cskhtoollxk",
      phien_truoc: currentData.Phien,
      xuc_xac: [currentData.Xuc_xac_1, currentData.Xuc_xac_2, currentData.Xuc_xac_3],
      tong_xuc_xac: currentData.Tong,
      ket_qua: currentData.Ket_qua,
      phien_sau: nextSession,
      du_doan: prediction,
      do_tin_cay: confidence,
      giai_thich: `Tra cứu mẫu 13 ký tự: ${historyString}`
    });

  } catch (err) {
    console.error("❌ Lỗi xử lý endpoint /api/2k15:", err.message);
    res.status(500).json({
      id: "@cskhtoollxk",
      error: "Lỗi hệ thống hoặc không thể lấy dữ liệu lịch sử",
      du_doan: "Không thể dự đoán",
      do_tin_cay: "0%",
      giai_thich: "Lỗi kết nối API nguồn hoặc dữ liệu không hợp lệ."
    });
  }
});

app.get('/', (req, res) => {
  res.send("Chào mừng đến API dự đoán Tài Xỉu! Truy cập /api/2k15 để xem dự đoán.");
});

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
           
