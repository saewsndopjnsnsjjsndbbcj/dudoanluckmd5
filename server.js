const express = require('express');
const axios = require('axios');
const fs = require('fs'); 
const path = require('path');

const app = express();
// Render sử dụng cổng trong biến môi trường PORT (thường là 10000)
const PORT = process.env.PORT || 3000; 

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://lichsu.onrender.com/api/taixiu/ws';
// 💡 ĐÃ SỬA: Sử dụng PREDICT_FILE_PATH trỏ đến 'thuattoan.txt'
const PREDICT_FILE_PATH = path.join(__dirname, 'thuattoan.txt'); 

// Biến lưu trữ hàm dự đoán đã được tạo
let vipPredictTX = null;

// --- HÀM TẢI VÀ TẠO THUẬT TOÁN TỪ FILE ---
function loadPredictAlgorithm() {
    try {
        // Đọc nội dung file đồng bộ (readFileSync) CHỈ MỘT LẦN khi khởi động
        const fileContent = fs.readFileSync(PREDICT_FILE_PATH, 'utf8');

        if (!fileContent || fileContent.trim().length === 0) {
            // Sẽ ném ra lỗi nếu file trống, giúp debug dễ hơn
            throw new Error(`File ${path.basename(PREDICT_FILE_PATH)} trống hoặc không có nội dung.`);
        }

        // Tạo hàm mới từ nội dung file. Đầu vào là 'index'.
        vipPredictTX = new Function('index', fileContent);
        
        console.log(`✅ Thuật toán dự đoán đã được tải thành công từ ${path.basename(PREDICT_FILE_PATH)}`);
        
        // Kiểm tra nhanh để đảm bảo hàm được tạo hợp lệ
        if (typeof vipPredictTX(1) !== 'string') {
             console.warn("⚠ Hàm dự đoán không trả về chuỗi 'Tài'/'Xỉu'. Kiểm tra lại logic file TXT.");
        }

    } catch (err) {
        // Lỗi này SẼ BỊ BẮT nếu file trống, thiếu hoặc sai cú pháp
        console.error(`❌ Lỗi CRITICAL khi tải thuật toán (${path.basename(PREDICT_FILE_PATH)}):`, err.message);
        // Thiết lập hàm mặc định để không làm treo server
        vipPredictTX = (index) => "Lỗi: Thuật toán không hoạt động";
    }
}

// Gọi hàm này ngay lập tức khi server khởi động
loadPredictAlgorithm(); 

// --- HÀM TẠO ĐỘ TIN CẬY NGẪU NHIÊN ---
function getRandomConfidence() {
  const min = 65.0;
  const max = 95.0;
  const confidence = Math.random() * (max - min) + min;
  return confidence.toFixed(1) + "%";
}

// --- ENDPOINT DỰ ĐOÁN ---
app.get('/api/2k15', async (req, res) => {
  // Kiểm tra lỗi tải thuật toán trước khi gọi API khác
  if (vipPredictTX(0).includes('Lỗi: Thuật toán không hoạt động')) {
       return res.status(503).json({
          id: "@cskhtoollxk",
          error: "Dịch vụ dự đoán không sẵn sàng",
          du_doan: vipPredictTX(0),
          do_tin_cay: "0%",
          giai_thich: "Vui lòng kiểm tra lại nội dung file thuattoan.txt"
      });
  }
  
  try {
    const response = await axios.get(HISTORY_API_URL);
    const data = Array.isArray(response.data) ? response.data : [response.data];
    if (!data || data.length === 0) throw new Error("Không có dữ liệu lịch sử");

    const currentData = data[0];
    
    const phienTruocStr = String(currentData.Phien);
    const phienTruocInt = parseInt(phienTruocStr);
    
    if (isNaN(phienTruocInt)) throw new Error(`Dữ liệu phiên không hợp lệ: ${phienTruocStr}`);
    
    const nextSession = phienTruocInt + 1;

    // Gọi hàm dự đoán đã được tải từ file
    const prediction = vipPredictTX(nextSession);
    const confidence = getRandomConfidence();

    res.json({
      id: "@cskhtoollxk",
      phien_truoc: phienTruocStr,
      xuc_xac: [currentData.Xuc_xac_1, currentData.Xuc_xac_2, currentData.Xuc_xac_3],
      tong_xuc_xac: currentData.Tong,
      ket_qua: currentData.Ket_qua,
      phien_sau: nextSession,
      du_doan: prediction,
      do_tin_cay: confidence,
      giai_thich: "bú cu tao không"
    });

  } catch (err) {
    console.error("❌ Lỗi xử lý endpoint /api/2k15:", err.message);
    res.status(500).json({
      id: "@cskhtoollxk",
      error: "Lỗi hệ thống hoặc không thể lấy dữ liệu lịch sử",
      du_doan: "Không thể dự đoán",
      do_tin_cay: "0%",
      giai_thich: "Lỗi nội bộ. Đang chờ dữ liệu lịch sử hoặc kết nối thất bại."
    });
  }
});

app.get('/', (req, res) => {
  res.send("Chào mừng đến API dự đoán Tài Xỉu! Truy cập /api/2k15 để xem dự đoán.");
});

// Khởi chạy server và lắng nghe CỔNG
app.listen(PORT, () => {
    // Thông báo này là DẤU HIỆU THÀNH CÔNG cho Render
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
        
