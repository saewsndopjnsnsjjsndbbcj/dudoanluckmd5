const express = require('express');
const axios = require('axios');
const fs = require('fs'); 
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; 

// --- CẤU HÌNH ---
const HISTORY_API_URL = 'https://lichsu.onrender.com/api/taixiu/ws';
const PREDICT_FILE_PATH = path.join(__dirname, 'thuattoan.txt'); 

// Biến lưu trữ hàm dự đoán đã được tạo
let vipPredictTX = null;

// --- HÀM TẢI VÀ TẠO THUẬT TOÁN TỪ FILE ---
function loadPredictAlgorithm() {
    try {
        const fileContent = fs.readFileSync(PREDICT_FILE_PATH, 'utf8');

        if (!fileContent || fileContent.trim().length === 0) {
            throw new Error(`File ${path.basename(PREDICT_FILE_PATH)} trống.`);
        }

        // 💡 CẢI TIẾN: HÀM CÓ 2 ĐỐI SỐ: 'index' VÀ 'historyString'
        // Bạn có thể dùng historyString trong logic của thuattoan.txt
        vipPredictTX = new Function('index', 'historyString', fileContent);
        
        console.log(`✅ Thuật toán dự đoán đã được tải thành công từ ${path.basename(PREDICT_FILE_PATH)}`);
        
    } catch (err) {
        console.error(`❌ Lỗi CRITICAL khi tải thuật toán (${path.basename(PREDICT_FILE_PATH)}):`, err.message);
        // Server vẫn chạy, nhưng hàm dự đoán sẽ báo lỗi
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

// Hàm giả lập lấy 13 kết quả lịch sử (Cần lấy từ API thực tế)
function getMockHistoryString(data) {
    // 💡 LƯU Ý: Bạn cần chỉnh sửa hàm này để lấy 13 kết quả T/X gần nhất từ API
    // Hiện tại, ta chỉ mock 13 ký tự 'T' để test hàm dự đoán.
    return 'TTTTTTTTTTTTT'; 
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
    
    // 💡 LẤY CHUỖI LỊCH SỬ MOCK/GIẢ ĐỊNH
    const historyString = getMockHistoryString(data); 

    // 💡 GỌI HÀM DỰ ĐOÁN VỚI 2 THAM SỐ
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

// ... (các endpoint khác)

app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});
