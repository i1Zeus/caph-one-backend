import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from '../../auth/decorators/universal-auth.decorator';
import { CreateBulkProductsDto } from './dto/create-bulk-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@Auth() // Require authentication for all product endpoints
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() createProductDto: CreateProductDto,
    @UploadedFile() image: Express.Multer.File,
    @Request() req,
  ) {
    console.log('=== CREATE PRODUCT DEBUG ===');
    console.log(
      'Image file:',
      image ? `${image.originalname} (${image.size} bytes)` : 'No image',
    );
    console.log('DTO:', createProductDto);
    console.log('User:', req.user);

    const userId = req.user?.userId || req.user?.id;
    return this.productsService.create(createProductDto, image, userId);
  }

  @Get()
  findAll(@Query() queryDto: ProductQueryDto) {
    return this.productsService.findAll(queryDto);
  }

  @Get('statistics')
  getStatistics() {
    return this.productsService.getProductStatistics();
  }

  @Get('barcode/:barcode')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get('low-stock')
  getLowStockProducts(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.productsService.getLowStockProducts(limit);
  }

  @Post('bulk')
  createBulk(
    @Body() createBulkProductsDto: CreateBulkProductsDto,
    @Request() req,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.productsService.createBulk(
      createBulkProductsDto.products,
      userId,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFile() image: Express.Multer.File,
    @Request() req,
  ) {
    console.log('=== UPDATE PRODUCT DEBUG ===');
    console.log('Product ID:', id);
    console.log(
      'Image file:',
      image ? `${image.originalname} (${image.size} bytes)` : 'No image',
    );
    console.log('DTO:', updateProductDto);
    console.log('User:', req.user);

    const userId = req.user?.userId || req.user?.id;
    return this.productsService.update(id, updateProductDto, image, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
