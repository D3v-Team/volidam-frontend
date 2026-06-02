import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  InputGroup,
  InputRightElement,
  VStack,
  IconButton,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Auth } from "../../Services/api/Auth";
import { useAuth } from "../../hooks/useAuth";
import { toastService } from "../../utils/toast";
import { useNavigate } from "react-router";
import { isAdmin, isOperator, isSuperAdmin } from "../../utils/roles";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passInput = useRef("");
  const logInput = useRef("");
  const [errors, setErrors] = useState({ login: "", password: "" });

  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loginText = logInput.current.value.trim();
    const password = passInput.current.value.trim();

    let newErrors = {};
    if (!loginText) newErrors.login = "Login kiritilmadi";
    if (!password) newErrors.password = "Parol kiritilmadi";
    else if (password.length < 6)
      newErrors.password = "Parol kamida 6 belgidan iborat bo'lishi kerak";

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      const res = await Auth.Login({
        username: logInput.current.value,
        password: passInput.current.value,
      });

      if (res.status === 200 || res.status === 201) {
        const data = res.data;
        login({
          token: data.tokens.access_token,
          refreshToken: data.tokens.refresh_token,
          user: data.user,
        });

        if (isSuperAdmin(data.user.role)) {
          navigate("/superadmin/dashboard");
          toastService.success("Xush kelibsiz, Super Admin!");
        } else if (isAdmin(data.user.role)) {
          navigate("/admin/leads");
          toastService.success("Muvaffaqiyatli kirdingiz, Admin!");
        } else if (isOperator(data.user.role)) {
          navigate("/operator/leads");
          toastService.success("Muvaffaqiyatli kirdingiz, Operator!");
        } else {
          toastService.error("Role mos kelmadi");
        }
      }
    } catch (err) {
      toastService.error(err?.response?.data?.message || "Tizim xatosi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

        .login-bg {
          background: linear-gradient(145deg, #fff5f5 0%, #fff0f0 35%, #ffcaca 65%, #fff0f0 85%, #fff5f5 100%) !important;
        }

        .login-bg::before {
          content: "❀  ✿  ❁  ✾  ❀  ✿  ❁";
          position: fixed;
          top: 5%;
          left: 0; right: 0;
          text-align: center;
          font-size: 1.1rem;
          color: #f48fb1;
          opacity: 0.28;
          letter-spacing: 2.2rem;
          pointer-events: none;
          z-index: 0;
        }

        .login-bg::after {
          content: "✿  ❁  ✾  ❀  ✿  ❁  ✾";
          position: fixed;
          bottom: 5%;
          left: 0; right: 0;
          text-align: center;
          font-size: 1.1rem;
          color: #f48fb1;
          opacity: 0.28;
          letter-spacing: 2.2rem;
          pointer-events: none;
          z-index: 0;
        }

        .login-card {
          background: rgba(255, 255, 255, 0.70) !important;
          backdrop-filter: blur(22px) !important;
          -webkit-backdrop-filter: blur(22px) !important;
          border: 1px solid rgba(244, 143, 177, 0.35) !important;
          box-shadow: 0 8px 40px rgba(233,30,99,0.09), 0 2px 12px rgba(233,30,99,0.05), inset 0 1px 0 rgba(255,255,255,0.88) !important;
          position: relative;
          overflow: hidden;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: -70px; right: -70px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(252,228,236,0.65) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        .login-card::after {
          content: '';
          position: absolute;
          bottom: -60px; left: -60px;
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(248,187,208,0.5) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }

        .login-title {
          font-family: 'Cormorant Garamond', serif !important;
          letter-spacing: 0.01em !important;
        }

        .login-label {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 0.78rem !important;
          font-weight: 500 !important;
          letter-spacing: 0.07em !important;
          text-transform: uppercase !important;
          color: #ad1457 !important;
          margin-bottom: 0.45rem !important;
        }

        .login-input {
          font-family: 'DM Sans', sans-serif !important;
          border-radius: 14px !important;
          border: 1.5px solid rgba(244,143,177,0.4) !important;
          background: rgba(255,255,255,0.65) !important;
          color: #880e4f !important;
          height: 50px !important;
          font-size: 0.95rem !important;
          transition: all 0.25s ease !important;
          padding-right: 45px !important;
        }

        .login-input::placeholder {
          color: #f48fb1 !important;
          opacity: 0.75 !important;
        }

        .login-input:hover {
          border-color: rgba(233,30,99,0.5) !important;
          background: rgba(255,255,255,0.82) !important;
        }

        .login-input:focus {
          border-color: #e91e63 !important;
          background: rgba(255,255,255,0.94) !important;
          box-shadow: 0 0 0 3px rgba(233,30,99,0.13) !important;
        }

        .login-input[aria-invalid="true"] {
          border-color: #e91e63 !important;
          box-shadow: 0 0 0 3px rgba(233,30,99,0.10) !important;
        }

        .login-error {
          font-family: 'DM Sans', sans-serif !important;
          font-size: 0.78rem !important;
          color: #c2185b !important;
        }

        .login-btn {
          font-family: 'DM Sans', sans-serif !important;
          border-radius: 25px !important;
          height: 52px !important;
          background: linear-gradient(135deg, #e91e63 0%, #c2185b 50%, #ad1457 100%) !important;
          color: #fff !important;
          font-weight: 500 !important;
          font-size: 0.88rem !important;
          letter-spacing: 0.1em !important;
          text-transform: uppercase !important;
          border: none !important;
          box-shadow: 0 6px 24px rgba(233,30,99,0.32), 0 2px 8px rgba(233,30,99,0.18) !important;
          transition: all 0.28s ease !important;
          position: relative;
          overflow: hidden;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 10px 32px rgba(233,30,99,0.40), 0 4px 12px rgba(233,30,99,0.22) !important;
          background: linear-gradient(135deg, #ec407a 0%, #e91e63 50%, #c2185b 100%) !important;
        }

        .login-btn:active:not(:disabled) {
          transform: translateY(0px) !important;
        }

        .login-btn::after {
          content: '';
          position: absolute;
          top: -50%; left: -65%;
          width: 40%; height: 200%;
          background: rgba(255,255,255,0.16);
          transform: skewX(-20deg);
          transition: left 0.5s ease;
          pointer-events: none;
        }

        .login-btn:hover::after {
          left: 130%;
        }

        .eye-icon {
          cursor: pointer;
          transition: all 0.2s ease;
        }
      `}</style>

      <Flex
        className="login-bg"
        minH="100vh"
        align="center"
        justify="center"
        px={4}
        position="relative"
      >
        <Box
          as="form"
          onSubmit={handleSubmit}
          className="login-card"
          w={{ base: "100%", sm: "440px" }}
          borderRadius="28px"
          p={{ base: "2rem 1.6rem", sm: "3rem 2.8rem 2.5rem" }}
          position="relative"
          zIndex={1}
        >
          <Heading
            className="login-title"
            textAlign="center"
            fontSize="2.1rem"
            fontWeight={500}
            color="#880e4f"
            mb={2}
            position="relative"
            zIndex={1}
          >
            Kirish
          </Heading>

          <Box className="login-divider" my={3} position="relative" zIndex={1} />

          <Text
            textAlign="center"
            fontSize="0.99rem"
            fontFamily="'DM Sans', sans-serif"
            fontWeight={300}
            color="#c2185b"
            opacity={0.72}
            mb={7}
            mt={3}
            letterSpacing="0.02em"
            position="relative"
            zIndex={1}
          >
            Tizimga kirish uchun ma'lumotlarni kiriting
          </Text>

          <VStack spacing={5} position="relative" zIndex={1}>
            <FormControl isInvalid={!!errors.login}>
              <FormLabel className="login-label">LOGIN</FormLabel>
              <InputGroup>
                <Input
                  ref={logInput}
                  className="login-input"
                  placeholder="volidam"
                  onChange={() => clearError("login")}
                />
              </InputGroup>
              <FormErrorMessage className="login-error">
                ✦ {errors.login}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.password}>
              <FormLabel className="login-label">PAROL</FormLabel>
              <InputGroup>
                <Input
                  ref={passInput}
                  className="login-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  onChange={() => clearError("password")}
                />
                <InputRightElement h="50px" alignItems="center">
                  <IconButton
                    type="button"
                    variant="ghost"
                    aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    icon={showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    onClick={() => setShowPassword(!showPassword)}
                    className="eye-icon"
                    _hover={{ color: "#e91e63" }}
                    color="#f48fb1"
                    background="transparent"
                    size="sm"
                  />
                </InputRightElement>
              </InputGroup>
              <FormErrorMessage className="login-error">
                ✦ {errors.password}
              </FormErrorMessage>
            </FormControl>
          </VStack>

          <Button
            type="submit"
            className="login-btn"
            w="100%"
            mt={5}
            mb={4}
            isLoading={loading}
            loadingText="Yuklanmoqda..."
            position="relative"
            zIndex={1}
          >
            ✦ KIRISH ✦
          </Button>
        </Box>
      </Flex>
    </>
  );
}