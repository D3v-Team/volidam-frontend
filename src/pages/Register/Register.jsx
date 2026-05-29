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
  Link,
  InputGroup,
  InputLeftElement,
  VStack,
} from "@chakra-ui/react";
import { useRef, useState } from "react";
import { Auth } from "../../Services/api/Auth";
import { toastService } from "../../utils/toast";
import { useNavigate } from "react-router";

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const fullNameInput = useRef("");
  const phoneInput = useRef("");

  const [errors, setErrors] = useState({ fullName: "", phone: "" });

  const clearError = (field) => {
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const fullName = fullNameInput.current.value.trim();
    const phone = phoneInput.current.value.trim();

    let newErrors = {};

    if (!fullName) {
      newErrors.fullName = "Ism familiya kiritilmadi";
    } else if (fullName.length < 3) {
      newErrors.fullName =
        "Ism familiya kamida 3 ta belgidan iborat bo'lishi kerak";
    }

    if (!phone) {
      newErrors.phone = "Telefon raqam kiritilmadi";
    } else if (!/^\+?[0-9]{9,13}$/.test(phone.replace(/\s/g, ""))) {
      newErrors.phone = "Telefon raqam noto'g'ri formatda";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      setLoading(true);
      const payload = { full_name: fullName, phone };
      const res = await Auth.Register(payload);
      if (res.status === 200 || res.status === 201) {
        toastService.success("Muvaffaqiyatli ro'yxatdan o'tdingiz!");
        navigate("/login");
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

                .reg-bg {
                    background: linear-gradient(145deg, #fdf0f5 0%, #fce4ec 35%, #f8bbd0 65%, #fce4ec 85%, #fdf0f5 100%) !important;
                }

                .reg-bg::before {
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

                .reg-bg::after {
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

                .reg-card {
                    background: rgba(255, 255, 255, 0.70) !important;
                    backdrop-filter: blur(22px) !important;
                    -webkit-backdrop-filter: blur(22px) !important;
                    border: 1px solid rgba(244, 143, 177, 0.35) !important;
                    box-shadow: 0 8px 40px rgba(233,30,99,0.09), 0 2px 12px rgba(233,30,99,0.05), inset 0 1px 0 rgba(255,255,255,0.88) !important;
                    position: relative;
                    overflow: hidden;
                }

                .reg-card::before {
                    content: '';
                    position: absolute;
                    top: -70px; right: -70px;
                    width: 200px; height: 200px;
                    background: radial-gradient(circle, rgba(252,228,236,0.65) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 0;
                }

                .reg-card::after {
                    content: '';
                    position: absolute;
                    bottom: -60px; left: -60px;
                    width: 180px; height: 180px;
                    background: radial-gradient(circle, rgba(248,187,208,0.5) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                    z-index: 0;
                }

                .reg-title {
                    font-family: 'Cormorant Garamond', serif !important;
                    letter-spacing: 0.01em !important;
                }

                .reg-label {
                    font-family: 'DM Sans', sans-serif !important;
                    font-size: 0.78rem !important;
                    font-weight: 500 !important;
                    letter-spacing: 0.07em !important;
                    text-transform: uppercase !important;
                    color: #ad1457 !important;
                    margin-bottom: 0.45rem !important;
                }

                .reg-input {
                    font-family: 'DM Sans', sans-serif !important;
                    border-radius: 14px !important;
                    border: 1.5px solid rgba(244,143,177,0.4) !important;
                    background: rgba(255,255,255,0.65) !important;
                    color: #880e4f !important;
                    height: 50px !important;
                    font-size: 0.95rem !important;
                    transition: all 0.25s ease !important;
                }

                .reg-input::placeholder {
                    color: #f48fb1 !important;
                    opacity: 0.75 !important;
                }

                .reg-input:hover {
                    border-color: rgba(233,30,99,0.5) !important;
                    background: rgba(255,255,255,0.82) !important;
                }

                .reg-input:focus {
                    border-color: #e91e63 !important;
                    background: rgba(255,255,255,0.94) !important;
                    box-shadow: 0 0 0 3px rgba(233,30,99,0.13) !important;
                }

                .reg-input[aria-invalid="true"] {
                    border-color: #e91e63 !important;
                    box-shadow: 0 0 0 3px rgba(233,30,99,0.10) !important;
                }

                .reg-error {
                    font-family: 'DM Sans', sans-serif !important;
                    font-size: 0.78rem !important;
                    color: #c2185b !important;
                }

                .reg-btn {
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

                .reg-btn:hover:not(:disabled) {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 10px 32px rgba(233,30,99,0.40), 0 4px 12px rgba(233,30,99,0.22) !important;
                    background: linear-gradient(135deg, #ec407a 0%, #e91e63 50%, #c2185b 100%) !important;
                }

                .reg-btn:active:not(:disabled) {
                    transform: translateY(0px) !important;
                }

                .reg-btn::after {
                    content: '';
                    position: absolute;
                    top: -50%; left: -65%;
                    width: 40%; height: 200%;
                    background: rgba(255,255,255,0.16);
                    transform: skewX(-20deg);
                    transition: left 0.5s ease;
                    pointer-events: none;
                }

                .reg-btn:hover::after {
                    left: 130%;
                }

                .reg-login-link {
                    font-family: 'DM Sans', sans-serif !important;
                    color: #e91e63 !important;
                    font-weight: 500 !important;
                    border-bottom: 1px dashed rgba(233,30,99,0.4) !important;
                    padding-bottom: 1px !important;
                    cursor: pointer !important;
                    text-decoration: none !important;
                    transition: opacity 0.2s !important;
                }

                .reg-login-link:hover {
                    opacity: 0.7 !important;
                    text-decoration: none !important;
                }

                .reg-divider {
                    width: 52px;
                    height: 2px;
                    background: linear-gradient(90deg, transparent, #f48fb1, transparent);
                    border-radius: 2px;
                    margin: 0 auto;
                }
            `}</style>

      <Flex
        className="reg-bg"
        minH="100vh"
        align="center"
        justify="center"
        px={4}
        position="relative"
      >
        <Box
          as="form"
          onSubmit={handleSubmit}
          className="reg-card"
          w={{ base: "100%", sm: "440px" }}
          borderRadius="28px"
          p={{ base: "2rem 1.6rem", sm: "3rem 2.8rem 2.5rem" }}
          position="relative"
          zIndex={1}
        >

          <Heading
            className="reg-title"
            textAlign="center"
            fontSize="2.1rem"
            fontWeight={500}
            color="#880e4f"
            mb={2}
            position="relative"
            zIndex={1}
          >
            Ro'yxatdan o'tish
          </Heading>

          <Box className="reg-divider" my={3} position="relative" zIndex={1} />

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
            Tizimga kirish uchun ma'lumotlarni to'ldiring
          </Text>

          <VStack spacing={5} position="relative" zIndex={1}>
            <FormControl isInvalid={!!errors.fullName}>
              <FormLabel className="reg-label">Ism Familiya</FormLabel>
              <InputGroup>
              
                <Input
                  ref={fullNameInput}
                  className="reg-input"
                  placeholder="Ism Familiyangizni kiriting"
                  onChange={() => clearError("fullName")}
                />
              </InputGroup>
              <FormErrorMessage className="reg-error">
                ✦ {errors.fullName}
              </FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.phone}>
              <FormLabel className="reg-label">Telefon Raqam</FormLabel>
              <InputGroup>
                
                <Input
                  ref={phoneInput}
                  className="reg-input"
                  placeholder="+998 90 123 45 67"
                  onChange={() => clearError("phone")}
                />
              </InputGroup>
              <FormErrorMessage className="reg-error">
                ✦ {errors.phone}
              </FormErrorMessage>
            </FormControl>
          </VStack>

          <Button
            type="submit"
            className="reg-btn"
            w="100%"
            mt={7}
            mb={4}
            isLoading={loading}
            loadingText="Yuklanmoqda..."
            position="relative"
            zIndex={1}
          >
            ✦ Ro'yxatdan o'tish ✦
          </Button>

           
        </Box>
      </Flex>
    </>
  );
}
