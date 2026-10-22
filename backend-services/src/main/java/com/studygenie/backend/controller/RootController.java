package com.studygenie.backend.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class RootController {

    @GetMapping("/")
    public String root() {
        return "redirect:/swagger-ui/index.html";
    }

    @GetMapping("/swagger-ui")
    public String swaggerUi() {
        return "redirect:/swagger-ui/index.html";
    }
}
