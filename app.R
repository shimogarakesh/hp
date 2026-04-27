library(shiny)
library(imager)
library(dplyr)
library(tidyr)
library(ggplot2)

ui <- fluidPage(
    titlePanel("Canopy Image Classifier"),
    sidebarLayout(
        sidebarPanel(
            fileInput("file", "Upload canopy photo", accept = c("image/jpeg","image/png")),
            sliderInput("cx", "FOV center X", min=0, max=1000, value=500),
            sliderInput("cy", "FOV center Y", min=0, max=1000, value=500),
            sliderInput("radius", "FOV radius", min=100, max=1000, value=400),
            h4("Thresholds"),
            sliderInput("green_hmin","Green Hue min",0,1,0.25),
            sliderInput("green_hmax","Green Hue max",0,1,0.45),
            sliderInput("green_smin","Green Saturation min",0,1,0.3),
            sliderInput("brown_hmin","Brown Hue min",0,1,0.05),
            sliderInput("brown_hmax","Brown Hue max",0,1,0.20),
            sliderInput("brown_smin","Brown Saturation min",0,1,0.2),
            sliderInput("brown_vmax","Brown Value max",0,1,0.6),
            sliderInput("sky_hmin","Sky Hue min",0,1,0.55),
            sliderInput("sky_hmax","Sky Hue max",0,1,0.75),
            sliderInput("sky_vmin","Sky Value min",0,1,0.7)
        ),
        mainPanel(
            plotOutput("classPlot"),
            plotOutput("piePlot"),
            verbatimTextOutput("rgbOut")
        )
    )
)

server <- function(input, output, session) {
    imgData <- reactive({
        req(input$file)
        load.image(input$file$datapath)
    })
    
    dfData <- reactive({
        img <- imgData()
        w <- width(img); h <- height(img)
        coords <- expand.grid(x=1:w, y=1:h)
        mask <- ((coords$x-input$cx)^2 + (coords$y-input$cy)^2) <= input$radius^2
        
        df <- as.data.frame(img, wide="c") %>%
            rename(R=c.1, G=c.2, B=c.3) %>%
            mutate(x=coords$x, y=coords$y, mask=mask) %>%
            filter(mask)
        
        hsv <- rgb2hsv(df$R, df$G, df$B)
        df$H <- hsv[1,]; df$S <- hsv[2,]; df$V <- hsv[3,]
        
        df <- df %>%
            mutate(class = case_when(
                H >= input$green_hmin & H <= input$green_hmax & S > input$green_smin ~ "Green",
                H >= input$brown_hmin & H <= input$brown_hmax & S > input$brown_smin & V < input$brown_vmax ~ "Brown",
                H >= input$sky_hmin & H <= input$sky_hmax & V > input$sky_vmin ~ "Sky",
                TRUE ~ "Other"
            ))
        
        # Split Green into Dark vs Light
        if(any(df$class=="Green")){
            thr <- median(df$V[df$class=="Green"])
            df$class[df$class=="Green" & df$V <= thr] <- "DarkGreen"
            df$class[df$class=="Green" & df$V > thr] <- "LightGreen"
        }
        df
    })
    
    output$classPlot <- renderPlot({
        df <- dfData()
        ggplot(df, aes(x=x,y=y,fill=class)) +
            geom_raster() +
            scale_fill_manual(values=c(
                "DarkGreen"="darkgreen","LightGreen"="lightgreen",
                "Brown"="sienna","Sky"="skyblue","Other"="grey50")) +
            coord_fixed() + theme_void() +
            ggtitle("Circular canopy classification")
    })
    
    output$piePlot <- renderPlot({
        df <- dfData()
        pixel_counts <- df %>% count(class) %>% mutate(percent=n/sum(n)*100)
        ggplot(pixel_counts, aes(x="", y=percent, fill=class)) +
            geom_col(width=1) + coord_polar(theta="y") +
            scale_fill_manual(values=c(
                "DarkGreen"="darkgreen","LightGreen"="lightgreen",
                "Brown"="sienna","Sky"="skyblue","Other"="grey50")) +
            theme_void() + ggtitle("Pixel class percentages")
    })
    
    output$rgbOut <- renderPrint({
        df <- dfData()
        dom_dark <- df %>% filter(class=="DarkGreen") %>% summarise(across(c(R,G,B), median)) %>% as.numeric()
        dom_light <- df %>% filter(class=="LightGreen") %>% summarise(across(c(R,G,B), median)) %>% as.numeric()
        cat("Dominant Dark Green RGB:", dom_dark, "\n")
        cat("Dominant Light Green RGB:", dom_light, "\n")
    })
}

shinyApp(ui, server)
