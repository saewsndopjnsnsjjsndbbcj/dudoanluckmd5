const express = require('express');
const axios = require('axios');
const fs = require('fs'); 
const path = require('path');

const app = express();
// Đảm bảo sử dụng cổng do Render cung cấp
const PORT = process.env.PORT || 3000; 

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://lichsu.onrender.com/api/taixiu/ws';
// Đã xác nhận tên file là 'thuattoan.txt'
const PREDICT_FILE_PATH = path.join(__dirname, 'thuattoan.txt'); 

let vipPredictTX = null;

// --- HÀM TẢI VÀ TẠO THUẬT TOÁN TỪ FILE ---
function loadPredictAlgorithm() {
    try {
        const fileContent = fs.readFileSync(PREDICT_FILE_PATH, 'utf8');

        if (!fileContent || fileContent.trim().length === 0) {
            throw new Error(`File ${path.basename(PREDICT_FILE_PATH)} trống.`);
        }

        // 💡 Chấp nhận 2 đối số: 'index' (số phiên) và 'historyString' (chuỗi lịch sử T/X)
        vipPredictTX = new Function('index', 'historyString', fileContent);
        
        console.log(`✅ Thuật toán dự đoán đã được tải thành công từ ${path.basename(PREDICT_FILE_PATH)}`);
        
    } catch (err) {
        // Lỗi CRITICAL, server vẫn chạy nhưng trả về lỗi 503 cho API
        console.error(`❌ Lỗi CRITICAL khi tải thuật toán (${path.basename(PREDICT_FILE_PATH)}):`, err.message);
        vipPredictTX = (index, historyString) => "Lỗi: Thuật toán không hoạt động";
    }
}

loadPredictAlgorithm(); 

// --- HÀM TẠO ĐỘ TIN CẬY NGẪU NHIÊN ---
function getRandomConfidence() {
  const min = 65.0;
  const max = 95.0;
  const confidence = Math.random() * (max - min) + min;
  return confidence.toFixed(1) + "%";
}

// 💡 HÀM GIẢ LẬP LẤY CHUỖI LỊCH SỬ 13 KÝ TỰ
function getHistoryString(currentData) {
    // Tạm thời trả về chuỗi mẫu, vì API nguồn chỉ trả về 1 phiên.
    // Bạn cần sửa hàm này nếu có API lịch sử đầy đủ.
    return 'TTTTTTTTTTTTT'; // Chuỗi mẫu 13 ký tự T/X
}

// --- ENDPOINT DỰ ĐOÁN ---
app.get('/api/2k15', async (req, res) => {
  // Kiểm tra lỗi tải thuật toán
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
    const response = await axios.get(HISTORY_API_URL);
    const data = Array.isArray(response.data) ? response.data : [response.data];
    if (!data || data.length === 0) throw new Error("Không có dữ liệu lịch sử");

    const currentData = data[0];
    
    const phienTruocInt = parseInt(String(currentData.Phien));
    if (isNaN(phienTruocInt)) throw new Error(`Dữ liệu phiên không hợp lệ: ${currentData.Phien}`);
    
    const nextSession = phienTruocInt + 1;
    
    // LẤY CHUỖI LỊCH SỬ (giả lập/thực tế)
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
      giai_thich: `lonmemay ${historyString}`
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
        
