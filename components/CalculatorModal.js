import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';

const { width } = Dimensions.get('window');

const CalculatorModal = ({ visible, onClose, userClass }) => {
  const [input, setInput] = useState("");

  // JAMB uses Basic, everyone else (WAEC, NECO) gets Scientific
  const isAdvanced = userClass && userClass.toUpperCase() !== "JAMB";

  // --- LOGIC ENGINE ---
  const handlePress = (val) => {
    if (val === "C") {
      setInput("");
    } else if (val === "⌫") {
      setInput(input.slice(0, -1));
    } else if (val === "=") {
      calculateResult();
    } else {
      setInput(input + val);
    }
  };

  const calculateResult = () => {
    try {
      let expression = input;

      // 1. Replace Visual Symbols with JS Math
      expression = expression.replace(/×/g, "*");
      expression = expression.replace(/÷/g, "/");
      expression = expression.replace(/π/g, "Math.PI");
      expression = expression.replace(/e/g, "Math.E");
      expression = expression.replace(/√\(/g, "Math.sqrt(");
      expression = expression.replace(/\^/g, "**");

      // 2. Handle Trig (Convert Degrees to Radians for students)
      // This regex looks for sin(number), cos(number), tan(number)
      expression = expression.replace(/sin\(([^)]+)\)/g, "Math.sin($1 * Math.PI / 180)");
      expression = expression.replace(/cos\(([^)]+)\)/g, "Math.cos($1 * Math.PI / 180)");
      expression = expression.replace(/tan\(([^)]+)\)/g, "Math.tan($1 * Math.PI / 180)");

      // 3. Handle Logs
      expression = expression.replace(/log\(/g, "Math.log10(");
      expression = expression.replace(/ln\(/g, "Math.log(");

      // 4. Evaluate
      // eslint-disable-next-line no-eval
      const result = eval(expression); 
      
      // 5. Format (Avoid 0.00000000000004)
      if (!isFinite(result)) {
        setInput("Error");
      } else {
        // Round to 8 decimal places to fix float precision errors
        const final = Math.round(result * 100000000) / 100000000;
        setInput(String(final));
      }
    } catch (e) {
      setInput("Error");
    }
  };

  // --- LAYOUTS ---
  const basicKeys = [
    "C", "⌫", "%", "÷",
    "7", "8", "9", "×",
    "4", "5", "6", "-",
    "1", "2", "3", "+",
    "00", "0", ".", "="
  ];

  const scientificKeys = [
    "C", "⌫", "(", ")", "÷",
    "sin(", "cos(", "tan(", "^", "×",
    "7", "8", "9", "√(", "-",
    "4", "5", "6", "log(", "+",
    "1", "2", "3", "ln(", "=",
    "0", ".", "π", "e", "00"
  ];

  const activeKeys = isAdvanced ? scientificKeys : basicKeys;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isAdvanced ? "Scientific Calculator" : "Basic Calculator"}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Screen */}
          <View style={styles.display}>
            <Text 
              style={styles.displayText} 
              numberOfLines={2} 
              adjustsFontSizeToFit
            >
              {input || "0"}
            </Text>
          </View>

          {/* Keypad Grid */}
          <View style={styles.keypad}>
            {activeKeys.map((btn, index) => {
              // Styling Logic
              const isOperator = ["÷", "×", "-", "+", "=", "^"].includes(btn);
              const isAction = ["C", "⌫"].includes(btn);
              const isFunction = ["sin(", "cos(", "tan(", "log(", "ln(", "√(", "π", "e", "(", ")"].includes(btn);
              
              // Width calculation: Advanced has 5 columns, Basic has 4
              const colCount = isAdvanced ? 5 : 4;
              const btnWidth = (width * 0.9 - (10 * colCount)) / colCount; 

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.btn,
                    { width: btnWidth, height: btnWidth * 0.8 }, // Aspect ratio
                    isOperator && styles.btnOperator,
                    isAction && styles.btnAction,
                    isFunction && styles.btnFunction
                  ]}
                  onPress={() => handlePress(btn)}
                >
                  <Text style={[
                    styles.btnText,
                    isOperator && styles.textWhite,
                    isAction && styles.textWhite,
                    isFunction && { fontSize: 16, fontWeight: '700' }
                  ]}>
                    {btn.replace('(', '')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

        </View>
      </View>
    </Modal>
  );
};

const COLORS = {
  bg: "#FFFFFF",
  display: "#F3F4F6",
  btnDefault: "#E5E7EB",
  btnOperator: "#864AF9", // Your Brand Purple
  btnAction: "#FF4757",   // Red
  btnFunction: "#D1D5DB", // Darker Grey for Sci keys
  textDark: "#1F2937",
  textWhite: "#FFFFFF",
  border: "#000000"
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    borderWidth: 3,
    borderColor: COLORS.border,
    paddingBottom: 40,
    // Neo-Brutalist Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.border,
    textTransform: 'uppercase',
  },
  closeIcon: {
    padding: 5,
  },
  closeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  display: {
    width: "100%",
    height: 80,
    backgroundColor: COLORS.display,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 15,
  },
  displayText: {
    fontSize: 40,
    fontWeight: "bold",
    color: COLORS.textDark,
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  btn: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.btnDefault,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    // Button Shadow
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  btnOperator: {
    backgroundColor: COLORS.btnOperator,
  },
  btnAction: {
    backgroundColor: COLORS.btnAction,
  },
  btnFunction: {
    backgroundColor: COLORS.btnFunction,
  },
  btnText: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  textWhite: {
    color: COLORS.textWhite,
  },
});

export default CalculatorModal;